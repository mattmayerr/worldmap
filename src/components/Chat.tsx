"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PracticeDebriefPanel } from "@/components/PracticeDebriefPanel";
import { CallOutcomeModal } from "@/components/CallOutcomeModal";
import { SaleClosedCelebrateModal } from "@/components/SaleClosedCelebrateModal";
import { ProgressionCelebrateModal } from "@/components/ProgressionCelebrateModal";
import { AioaStatsPanel } from "@/components/AioaStatsPanel";
import { LiveRebuttalFeedback, type LiveRebuttalEntry } from "@/components/LiveRebuttalFeedback";
import { useVoicePractice } from "@/hooks/useVoicePractice";
import { isAgentUser, useSessionUser } from "@/hooks/useSessionUser";
import { IconBook, IconMic, IconPhone, IconSparkles } from "@/components/ui/Icons";
import { canGenerateDebrief, normalizeDebrief } from "@/lib/debrief-utils";
import {
  buildPracticeKickoff,
  getCoachStarter,
  getKnowledgeStarter,
  getPracticeStarter,
  KNOWLEDGE_PROMPTS,
} from "@/lib/kickoff";
import { parseObjections } from "@/lib/objections";
import {
  pickDiverseSessionObjections,
  resolveObjectionMeta,
  SESSION_OBJECTION_HINT_COUNT,
} from "@/lib/objection-library";
import type { ResolvedObjection } from "@/lib/objection-library";
import { buildObjectionRotationDirective } from "@/lib/objection-rotation";
import { buildProspectDirective, countAgentTurns, PRACTICE_HANGUP_LINE } from "@/lib/aioa-utils";
import type { AioaCallOutcome, AioaEvaluation, PracticeCallOutcome } from "@/lib/types";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type ChatMessage,
  type ChatMode,
  type ObjectionTrackerItem,
  type PracticeDebrief,
} from "@/lib/types";
import type { SessionXpAwardResult } from "@/lib/progression-types";
import {
  buildCelebrationPreview,
  parseCelebrationPreview,
} from "@/lib/celebration-preview";

const COACH_PROMPTS = [
  "They said they need to think about it — how do I close today?",
  "What's the difference between Deluxe and Topline?",
  "They want me to call back tomorrow — what do I say to keep them on the line?",
];

const AGENT_CHAT_TABS = [
  { mode: "practice" as const, label: "Practice", icon: IconPhone, iconClass: "text-blue-300", activeClass: "bg-blue-500/25 text-white ring-1 ring-blue-500/40" },
  { mode: "coach" as const, label: "Coach", icon: IconSparkles, iconClass: "text-violet-300", activeClass: "bg-violet-500/25 text-white ring-1 ring-violet-500/40" },
  { mode: "knowledge" as const, label: "EB Wiki", icon: IconBook, iconClass: "text-emerald-300", activeClass: "bg-emerald-500/25 text-white ring-1 ring-emerald-500/40" },
] as const;

const MODE_META: Record<
  ChatMode,
  { label: string; subtitle: string; placeholder: string }
> = {
  practice: {
    label: "Practice",
    subtitle: "Role-play with a prospect who knows your objections",
    placeholder: "Handle an objection, explain a plan, or ask for the sale...",
  },
  coach: {
    label: "Coach",
    subtitle: "Get scripts and tactics specific to your business",
    placeholder: 'e.g. "They said they need to ask their wife — what do I say?"',
  },
  knowledge: {
    label: "Knowledge",
    subtitle: "Ask questions about your company, plans, and policies",
    placeholder: 'e.g. "What is covered under the Home plan?"',
  },
};

const LOADING_LABEL: Record<ChatMode, string> = {
  practice: "Prospect is thinking...",
  coach: "Coach is thinking...",
  knowledge: "Looking that up...",
};

interface TurnResult {
  assistantText: string;
  conversation: ChatMessage[];
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20"
            : "glass-card text-slate-100"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function getStarter(mode: ChatMode, profile: BusinessProfile): string {
  if (mode === "practice") return getPracticeStarter(profile);
  if (mode === "coach") return getCoachStarter(profile);
  return getKnowledgeStarter(profile);
}

function getQuickPrompts(mode: ChatMode): string[] {
  if (mode === "coach") return COACH_PROMPTS;
  if (mode === "knowledge") return KNOWLEDGE_PROMPTS;
  return [];
}

export function Chat({ defaultMode = "practice" }: { defaultMode?: ChatMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSessionUser();
  const agentView = isAgentUser(user);
  const [mode, setMode] = useState<ChatMode>(defaultMode);
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [debrief, setDebrief] = useState<PracticeDebrief | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [scoredObjections, setScoredObjections] = useState<ObjectionTrackerItem[]>([]);
  const [objectionPoolSize, setObjectionPoolSize] = useState(0);
  const [scoringObjections, setScoringObjections] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [progressionCelebration, setProgressionCelebration] = useState<SessionXpAwardResult | null>(
    null
  );
  const [callOutcome, setCallOutcome] = useState<PracticeCallOutcome>("active");
  const [lastAioa, setLastAioa] = useState<AioaEvaluation | null>(null);
  const [liveRebuttals, setLiveRebuttals] = useState<LiveRebuttalEntry[]>([]);
  const [outcomeModal, setOutcomeModal] = useState<"won" | "hung_up" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const scoredObjectionsRef = useRef<ObjectionTrackerItem[]>([]);
  const sessionObjectionHintsRef = useRef<ResolvedObjection[]>([]);
  const callOutcomeRef = useRef<PracticeCallOutcome>("active");
  const sessionSavedRef = useRef(false);
  const hangupReviewStartedRef = useRef(false);
  const endCallAndReviewRef = useRef<(conversationMessages?: ChatMessage[]) => Promise<void>>(
    async () => {}
  );
  const savePracticeSessionRef = useRef<
    (debriefResult: PracticeDebrief | null, conversationMessages?: ChatMessage[]) => Promise<boolean>
  >(async () => false);
  const voiceActive = voiceMode && mode === "practice";
  const meta = MODE_META[mode];
  const showPracticeSidebar = mode === "practice";

  useEffect(() => {
    if (!agentView) return;
    if (pathname === "/coach") {
      setMode("coach");
    } else if (pathname === "/wiki") {
      setMode("knowledge");
    } else if (pathname === "/") {
      setMode("practice");
    }
  }, [agentView, pathname]);

  useEffect(() => {
    const preview = parseCelebrationPreview(searchParams.get("celebrate"));
    if (!preview) return;
    setProgressionCelebration(buildCelebrationPreview(preview));
  }, [searchParams]);

  useEffect(() => {
    callOutcomeRef.current = callOutcome;
  }, [callOutcome]);

  useEffect(() => {
    sessionSavedRef.current = sessionSaved;
  }, [sessionSaved]);

  useEffect(() => {
    scoredObjectionsRef.current = scoredObjections;
  }, [scoredObjections]);

  const loadPracticePool = useCallback(async (profileObjections: string[]) => {
    try {
      const response = await fetch("/api/practice/objections/status?count=1&shuffle=0");
      const data = await response.json();
      if (!response.ok) return;

      setObjectionPoolSize((data.poolSize as number) ?? 0);

      const pool = ((data.categories ?? []) as Array<{ objections: ResolvedObjection[] }>).flatMap(
        (category) => category.objections
      );

      if (pool.length === 0) {
        sessionObjectionHintsRef.current = profileObjections.map((text) =>
          resolveObjectionMeta(text, "profile")
        );
        return;
      }

      const hints = pickDiverseSessionObjections(pool, SESSION_OBJECTION_HINT_COUNT);
      sessionObjectionHintsRef.current = hints;
    } catch {
      sessionObjectionHintsRef.current = profileObjections.map((text) =>
        resolveObjectionMeta(text, "profile")
      );
    }
  }, []);

  const applyScoreResponse = useCallback((data: Record<string, unknown>): AioaCallOutcome => {
    const evaluation = data.exampleEvaluation as
      | {
          aioa?: AioaEvaluation;
          overallScore?: number;
          summary?: string;
        }
      | undefined;
    const callOutcomeResult = (data.callOutcome as AioaCallOutcome) ?? "continue";

    if (evaluation?.aioa) {
      setLastAioa(evaluation.aioa);

      if (data.scoredObjection && !data.skipped) {
        const item = data.scoredObjection as ObjectionTrackerItem;
        const entry: LiveRebuttalEntry = {
          id: `${Date.now()}-${item.id}`,
          objectionText: item.text,
          overallScore: evaluation.overallScore ?? evaluation.aioa.overallScore,
          aioa: evaluation.aioa,
          summary: evaluation.summary ?? evaluation.aioa.summary,
          feedback: item.feedback ?? "",
        };
        setLiveRebuttals((prev) => [entry, ...prev]);
      }
    }

    if (data.scoredObjection && !data.skipped) {
      const item = data.scoredObjection as ObjectionTrackerItem;
      const next = [...scoredObjectionsRef.current, item];
      scoredObjectionsRef.current = next;
      setScoredObjections(next);
    }

    return callOutcomeResult;
  }, []);

  const buildRotationDirective = useCallback(
    (data: Record<string, unknown>): string => {
      if (data.skipped || !data.scoredObjection || data.callOutcome !== "continue") {
        return "";
      }

      const evaluation = data.exampleEvaluation as { overallScore?: number } | undefined;
      const handled: ResolvedObjection[] = scoredObjectionsRef.current.map((item) => ({
        id: item.libraryId ?? item.id,
        text: item.text,
        category: item.category ?? "resistance",
        source: item.source ?? "library",
      }));

      return buildObjectionRotationDirective({
        handledObjections: handled,
        sessionHints: sessionObjectionHintsRef.current,
        lastScore: evaluation?.overallScore,
      });
    },
    []
  );

  const scorePracticeTurn = useCallback(
    async (
      conversation: ChatMessage[]
    ): Promise<{ outcome: AioaCallOutcome; rotationDirective: string } | null> => {
      const lastUser = [...conversation].reverse().find((message) => message.role === "user");
      if (!lastUser || lastUser.content.trim().startsWith("[")) return null;

      setScoringObjections(true);
      try {
        const response = await fetch("/api/practice/objections/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversation }),
        });

        const data = await response.json();
        if (!response.ok) return null;
        if (data.skipped) return { outcome: "continue", rotationDirective: "" };

        const outcome = applyScoreResponse(data);
        const rotationDirective = buildRotationDirective(data);
        return { outcome, rotationDirective };
      } finally {
        setScoringObjections(false);
      }
    },
    [applyScoreResponse, buildRotationDirective]
  );

  const sendMessage = useCallback(
    async (
      content: string,
      currentMessages?: ChatMessage[],
      options?: { prospectDirective?: string; deferAssistantDisplay?: boolean }
    ): Promise<TurnResult | null> => {
      const trimmed = content.trim();
      if (!trimmed || loadingRef.current) return null;
      if (callOutcomeRef.current === "hung_up") return null;

      const baseMessages = currentMessages ?? messages;
      const nextMessages: ChatMessage[] = [...baseMessages, { role: "user", content: trimmed }];

      setMessages(nextMessages);
      setInput("");
      setLoading(true);
      loadingRef.current = true;
      setError(null);

      let prospectDirective = options?.prospectDirective ?? "";
      let pendingOutcomeModal: "won" | "hung_up" | null = null;
      const deferAssistantDisplay = options?.deferAssistantDisplay ?? false;

      try {
        if (mode === "practice" && callOutcomeRef.current === "active" && !prospectDirective) {
          const agentTurns = countAgentTurns(nextMessages);
          if (agentTurns >= 1) {
            const scoreResult = await scorePracticeTurn(nextMessages);
            if (scoreResult) {
              const { outcome: aioaOutcome, rotationDirective } = scoreResult;
              if (rotationDirective) {
                prospectDirective = rotationDirective;
              }
              if (aioaOutcome === "win") {
                prospectDirective = buildProspectDirective("win");
                callOutcomeRef.current = "won";
                setCallOutcome("won");
                pendingOutcomeModal = "won";
                voice.stopListening();
              } else if (aioaOutcome === "hangup") {
                callOutcomeRef.current = "hung_up";
                setCallOutcome("hung_up");
                voice.stopListening();
                voice.stopSpeaking();

                const conversation: ChatMessage[] = [
                  ...nextMessages,
                  { role: "assistant", content: PRACTICE_HANGUP_LINE },
                ];
                setMessages(conversation);
                setOutcomeModal("hung_up");
                void savePracticeSessionRef.current(null, conversation);

                return { assistantText: "", conversation };
              }
            }
          }
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            messages: nextMessages,
            prospectDirective: prospectDirective || undefined,
            practiceObjections:
              mode === "practice"
                ? sessionObjectionHintsRef.current.map((item) => item.text)
                : undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to get a response.");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream available.");
        }

        const decoder = new TextDecoder();
        let assistantText = "";

        if (!deferAssistantDisplay) {
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          assistantText += decoder.decode(value, { stream: true });

          if (!deferAssistantDisplay) {
            const snapshot = assistantText;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: "assistant", content: snapshot };
              return copy;
            });
          }
        }

        const conversation: ChatMessage[] = [
          ...nextMessages,
          { role: "assistant", content: assistantText },
        ];

        if (pendingOutcomeModal) {
          setOutcomeModal(pendingOutcomeModal);
        }

        return { assistantText, conversation };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        setMessages((prev) =>
          prev[prev.length - 1]?.role === "assistant" && prev[prev.length - 1]?.content === ""
            ? prev.slice(0, -1)
            : prev
        );
        return null;
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [messages, mode, scorePracticeTurn]
  );

  const completePracticeTurnRef = useRef<
    (content: string, currentMessages?: ChatMessage[]) => Promise<TurnResult | null>
  >(async () => null);

  const voice = useVoicePractice({
    enabled: voiceActive,
    onTranscript: (text) => {
      if (!loadingRef.current && callOutcomeRef.current === "active") {
        void completePracticeTurnRef.current(text);
      }
    },
    onVoiceError: (message) => setError(message),
  });

  const completePracticeTurn = useCallback(
    async (content: string, currentMessages?: ChatMessage[]): Promise<TurnResult | null> => {
      if (voiceActive) {
        const result = await sendMessage(content, currentMessages, { deferAssistantDisplay: true });
        if (result?.assistantText && callOutcomeRef.current !== "hung_up") {
          let revealed = false;
          const revealAssistant = () => {
            if (revealed) return;
            revealed = true;
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: result.assistantText },
            ]);
          };

          try {
            await voice.speak(result.assistantText, { onStart: revealAssistant });
          } catch {
            revealAssistant();
          }

          if (!revealed) {
            revealAssistant();
          }

          if (voiceMode && callOutcomeRef.current === "active") voice.startListening();
        }
        return result;
      }

      return sendMessage(content, currentMessages);
    },
    [sendMessage, voice, voiceActive, voiceMode]
  );

  completePracticeTurnRef.current = completePracticeTurn;

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        const data = await response.json();
        if (response.ok) {
          setProfile(data.profile);
          await loadPracticePool(parseObjections(data.profile.commonObjections));
        }
      } catch {
        // Profile is optional for display; chat still works server-side.
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function switchMode(next: ChatMode) {
    if (agentView) {
      if (next === "coach" && pathname !== "/coach") {
        router.push("/coach");
        return;
      }
      if (next === "knowledge" && pathname !== "/wiki") {
        router.push("/wiki");
        return;
      }
      if (next === "practice" && pathname !== "/") {
        router.push("/");
        return;
      }
      if (next !== "practice" && next !== "coach" && next !== "knowledge") return;
    }

    setMode(next);
    setMessages([]);
    setError(null);
    setInput("");
    setShowDebrief(false);
    setDebrief(null);
    setSessionSaved(false);
    sessionSavedRef.current = false;
    hangupReviewStartedRef.current = false;
    setXpEarned(null);
    setProgressionCelebration(null);
    setCallOutcome("active");
    callOutcomeRef.current = "active";
    setLastAioa(null);
    setLiveRebuttals([]);
    setOutcomeModal(null);
    setScoredObjections([]);
    scoredObjectionsRef.current = [];
    if (next === "practice") {
      void loadPracticePool(parseObjections(profile.commonObjections));
    }
    if (next !== "practice") {
      setVoiceMode(false);
    }
  }

  function startNewCall() {
    voice.stopListening();
    voice.stopSpeaking();
    if (callOutcomeRef.current === "hung_up" && !sessionSavedRef.current && messages.length > 0) {
      void savePracticeSession(null, messages);
    }
    setMessages([]);
    setInput("");
    setError(null);
    setShowDebrief(false);
    setDebrief(null);
    setSessionSaved(false);
    sessionSavedRef.current = false;
    hangupReviewStartedRef.current = false;
    setXpEarned(null);
    setProgressionCelebration(null);
    setCallOutcome("active");
    callOutcomeRef.current = "active";
    setLastAioa(null);
    setLiveRebuttals([]);
    setOutcomeModal(null);
    setScoredObjections([]);
    scoredObjectionsRef.current = [];
    void loadPracticePool(parseObjections(profile.commonObjections));
  }

  async function savePracticeSession(
    debriefResult: PracticeDebrief | null,
    conversationMessages?: ChatMessage[]
  ): Promise<boolean> {
    if (sessionSavedRef.current) return true;

    const transcript = conversationMessages ?? messages;
    if (transcript.length === 0) return false;

    try {
      const response = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          voiceMode,
          objectionDrill: false,
          messages: transcript,
          debrief: debriefResult,
          objectionScores: scoredObjectionsRef.current,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionSaved(true);
        sessionSavedRef.current = true;
        if (typeof data.xpEarned?.total === "number") {
          setXpEarned(data.xpEarned.total);
        }
        const award = data.progression as SessionXpAwardResult | undefined;
        if (award?.milestones?.length) {
          setProgressionCelebration(award);
        }
        return true;
      }
    } catch {
      // session save is best-effort; debrief still shows
    }

    return false;
  }

  async function endCallAndReview(conversationMessages?: ChatMessage[]) {
    const transcript = conversationMessages ?? messages;
    if (debriefLoading) return;

    voice.stopListening();
    voice.stopSpeaking();
    setError(null);
    setOutcomeModal(null);
    hangupReviewStartedRef.current = true;

    if (!canGenerateDebrief(transcript)) {
      await savePracticeSession(null, transcript);
      return;
    }

    setShowDebrief(true);
    setDebriefLoading(true);
    setDebrief(null);

    try {
      const response = await fetch("/api/practice/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: transcript }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate debrief.");
      }

      const normalized = normalizeDebrief(data.debrief);
      setDebrief(normalized);
      await savePracticeSession(normalized, transcript);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Debrief failed.";
      setError(message);
      await savePracticeSession(null, transcript);
      setShowDebrief(false);
    } finally {
      setDebriefLoading(false);
    }
  }

  endCallAndReviewRef.current = endCallAndReview;

  savePracticeSessionRef.current = savePracticeSession;

  async function startPracticeCall() {
    await completePracticeTurn(buildPracticeKickoff(profile), []);
  }

  async function handleStartSession() {
    if (mode === "practice") {
      await startPracticeCall();
      return;
    }

    if (mode === "coach" && COACH_PROMPTS[0]) {
      await sendMessage(COACH_PROMPTS[0], []);
      return;
    }

    if (mode === "knowledge" && KNOWLEDGE_PROMPTS[0]) {
      await sendMessage(KNOWLEDGE_PROMPTS[0], []);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "practice") {
      void completePracticeTurn(input);
    } else {
      void sendMessage(input);
    }
  }

  const starter = getStarter(mode, profile);
  const quickPrompts = getQuickPrompts(mode);

  const voiceStatus = voice.speaking
    ? "Prospect is speaking..."
    : voice.transcribing
      ? "Processing your speech..."
      : voice.listening
        ? agentView
          ? "Listening — speak now"
          : "Listening — speak now, pauses when you stop"
        : loading
          ? LOADING_LABEL[mode]
          : voiceMode
            ? agentView
              ? "Voice call on"
              : "Voice call active"
            : null;

  const headerTitle = agentView
    ? mode === "coach"
      ? "Get help"
      : mode === "knowledge"
        ? "EB Wiki"
        : "Practice"
    : `${meta.label} mode`;

  const headerSubtitle = agentView
    ? mode === "coach"
      ? "Ask for a script or what to say next"
      : mode === "knowledge"
        ? "Look up plans, coverage, and company info"
        : voiceActive
          ? "Talk back and forth like a real phone call"
          : "Warm transfer — they expect your call after the screener"
    : voiceActive
      ? "Voice call — talk back and forth like a real phone call"
      : meta.subtitle;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header
        className={`shrink-0 px-4 py-4 md:px-8 ${
          agentView ? "md:border-b md:border-white/[0.06] md:bg-white/[0.02]" : "border-b border-surface-border bg-surface-raised/60 backdrop-blur"
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className={agentView ? "hidden md:block" : ""}>
            <h2 className="text-lg font-semibold tracking-tight text-white">{headerTitle}</h2>
            <p className="mt-0.5 text-sm text-slate-400">{headerSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === "practice" && canGenerateDebrief(messages) && callOutcome !== "hung_up" && (
              <button
                type="button"
                onClick={() => void endCallAndReview()}
                disabled={loading || debriefLoading}
                className={`rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 font-medium text-white shadow-lg shadow-violet-500/20 transition hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 ${
                  agentView ? "flex-1 px-4 py-3 text-sm sm:flex-none sm:px-5 sm:text-base" : "px-4 py-2 text-sm"
                }`}
              >
                {agentView ? "Finish & see how I did" : "End call & review"}
              </button>
            )}

            {mode === "practice" && voice.supported && (
              <button
                type="button"
                onClick={() => {
                  if (voiceMode) {
                    voice.stopListening();
                    voice.stopSpeaking();
                  }
                  setVoiceMode((prev) => !prev);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  voiceMode
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "btn-secondary"
                }`}
              >
                <IconMic className="h-4 w-4" />
                {voiceMode ? "Voice on" : "Voice"}
              </button>
            )}

            {agentView ? (
              <div className="flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/[0.08]">
                {AGENT_CHAT_TABS.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.mode}
                      type="button"
                      onClick={() => switchMode(tab.mode)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 md:px-4 ${
                        mode === tab.mode ? tab.activeClass : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <TabIcon className={`h-4 w-4 ${mode === tab.mode ? tab.iconClass : ""}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex rounded-xl bg-surface p-1 ring-1 ring-surface-border">
                {(Object.keys(MODE_META) as ChatMode[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchMode(key)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors md:px-4 ${
                      mode === key
                        ? "bg-accent text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {MODE_META[key].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {messages.length === 0 ? (
              <div
                className={`mx-auto flex max-w-2xl flex-col items-center justify-center text-center ${
                  agentView ? "gap-8 py-10 md:py-16" : "gap-6 py-16"
                }`}
              >
                {agentView && mode === "practice" ? (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 scale-150 rounded-full bg-blue-500/20 blur-3xl" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-glow">
                        <IconPhone className="h-9 w-9 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold tracking-tight text-white">
                        Ready to practice?
                      </h3>
                      <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-400">
                        {starter}
                      </p>
                    </div>
                    <ol className="w-full max-w-xs space-y-3 text-left text-sm text-slate-400">
                      {[
                        "They were transferred — introduce yourself and pitch",
                        "When they object, use AIOA to rebuttal",
                        "Ask for same-day enrollment — close before you hang up",
                      ].map((step, index) => (
                        <li key={step} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-blue-300">
                            {index + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    {voiceActive && (
                      <p className="text-xs text-emerald-400">
                        Allow microphone access when asked, then talk naturally.
                      </p>
                    )}
                  </>
                ) : agentView && mode === "coach" ? (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 scale-150 rounded-full bg-violet-500/20 blur-3xl" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-glow">
                        <IconSparkles className="h-9 w-9 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold tracking-tight text-white">
                        Need a script?
                      </h3>
                      <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-400">
                        {starter}
                      </p>
                    </div>
                    <ol className="w-full max-w-xs space-y-3 text-left text-sm text-slate-400">
                      {[
                        "Describe the objection or situation you're facing",
                        "Get word-for-word lines for a same-day close",
                        "Use it on your next live call or practice session",
                      ].map((step, index) => (
                        <li key={step} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-violet-300">
                            {index + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : agentView && mode === "knowledge" ? (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 scale-150 rounded-full bg-emerald-500/20 blur-3xl" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow">
                        <IconBook className="h-9 w-9 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold tracking-tight text-white">
                        EverythingBreaks wiki
                      </h3>
                      <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-400">
                        {starter}
                      </p>
                    </div>
                    <ol className="w-full max-w-xs space-y-3 text-left text-sm text-slate-400">
                      {[
                        "Ask about plans, pricing, or what's covered",
                        "Look up claims, policies, and how things work",
                        "Get answers grounded in company docs — not guesses",
                      ].map((step, index) => (
                        <li key={step} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-emerald-300">
                            {index + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <div className="glass-card px-6 py-5">
                    <p className="text-sm leading-relaxed text-slate-300">{starter}</p>
                    {voiceActive && (
                      <p className="mt-3 text-xs text-emerald-300">
                        {agentView
                          ? "Allow microphone access when asked, then talk naturally."
                          : "Voice call uses your OpenAI API for speech. Allow microphone access when prompted, then talk naturally — it stops when you pause."}
                      </p>
                    )}
                    {mode === "practice" && objectionPoolSize > 0 && !agentView && (
                      <p className="mt-3 text-xs text-slate-400">
                        Objections are thrown in randomly during the call — AIOA scores update in
                        the side panel as you handle them.
                      </p>
                    )}
                  </div>
                )}
                {(mode !== "knowledge" || agentView) && (
                  <div className="flex w-full max-w-sm flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => void handleStartSession()}
                      disabled={loading}
                      className={
                        agentView && mode === "practice"
                          ? "btn-primary w-full !py-4 !text-base shadow-glow"
                          : agentView && mode === "coach"
                            ? "w-full rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-violet-400 disabled:opacity-50"
                            : agentView && mode === "knowledge"
                              ? "w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50"
                          : "rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                      }
                    >
                      {mode === "practice"
                        ? voiceMode
                          ? "Start voice call"
                          : "Start practice call"
                        : mode === "knowledge"
                          ? agentView
                            ? "Ask a question"
                            : "Start knowledge session"
                          : agentView
                            ? "Ask for help"
                            : "Start coaching session"}
                    </button>
                  </div>
                )}
                {quickPrompts.length > 0 && !voiceActive && (!agentView || mode === "coach" || mode === "knowledge") && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs text-slate-400 transition hover:border-accent/50 hover:text-slate-200"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative mx-auto max-w-3xl">
                {callOutcome === "hung_up" && mode === "practice" && (
                  <div
                    className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-slate-950/50 backdrop-blur-[1px]"
                    aria-hidden
                  />
                )}
                {mode === "practice" && (liveRebuttals[0] || scoringObjections) && (
                  <div className="sticky top-0 z-10 mb-4 bg-gradient-to-b from-surface via-surface to-transparent pb-2 pt-1">
                    <LiveRebuttalFeedback
                      latest={liveRebuttals[0] ?? null}
                      history={liveRebuttals}
                      scoring={scoringObjections}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  {messages.map((message, index) => (
                    <MessageBubble key={`${message.role}-${index}`} message={message} />
                  ))}
                  {loading && !voiceActive && (
                    <div className="text-sm text-slate-500">{LOADING_LABEL[mode]}</div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}
          </div>

          {showPracticeSidebar && mode === "practice" && (
            <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.02] px-3 py-2 lg:hidden">
              <LiveRebuttalFeedback
                latest={liveRebuttals[0] ?? null}
                history={liveRebuttals}
                scoring={scoringObjections}
                compact
              />
            </div>
          )}

          <footer
            className={`shrink-0 border-t border-white/[0.06] bg-white/[0.02] px-4 py-4 backdrop-blur-md md:px-8 ${
              callOutcome === "hung_up" && mode === "practice" ? "opacity-40" : ""
            }`}
          >
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {voiceActive && voiceStatus && (
              <div className="mx-auto mb-3 flex max-w-3xl items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    voice.listening
                      ? "animate-pulse bg-red-400"
                      : voice.speaking
                        ? "animate-pulse bg-emerald-300"
                        : "bg-slate-400"
                  }`}
                />
                <span className="text-sm text-emerald-100">{voiceStatus}</span>
              </div>
            )}

            {callOutcome === "hung_up" && mode === "practice" && (
              <p className="mx-auto mb-3 max-w-3xl text-center text-sm text-slate-500">
                Call ended — customer hung up
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className={`mx-auto flex max-w-3xl gap-3 ${
                callOutcome === "hung_up" && mode === "practice" ? "pointer-events-none" : ""
              }`}
            >
              {voiceActive && (
                <button
                  type="button"
                  onClick={() => {
                    if (voice.listening) {
                      voice.stopListening();
                    } else if (!loading && !voice.speaking) {
                      voice.startListening();
                    }
                  }}
                  disabled={loading || voice.speaking || voice.transcribing || callOutcome === "hung_up"}
                  className={`self-end rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    voice.listening
                      ? "bg-red-500 text-white hover:bg-red-400"
                      : "bg-surface text-slate-200 ring-1 ring-surface-border hover:ring-emerald-500/50"
                  }`}
                  title={voice.listening ? "Stop listening" : "Start speaking"}
                >
                  {voice.listening ? "Stop" : "Mic"}
                </button>
              )}
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (mode === "practice") {
                      void completePracticeTurn(input);
                    } else {
                      void sendMessage(input);
                    }
                  }
                }}
                rows={2}
                placeholder={
                  callOutcome === "hung_up"
                    ? "Customer hung up — use the popup to review or start over"
                    : callOutcome === "won"
                      ? "Continue setting them up on coverage..."
                      : voiceActive
                        ? "Or type here — mic turns on automatically after the prospect speaks"
                        : meta.placeholder
                }
                disabled={callOutcome === "hung_up" || loading}
                className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || callOutcome === "hung_up" || !input.trim()}
                className="self-end rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </footer>
        </div>

        {showPracticeSidebar && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-white/[0.06] bg-white/[0.02] lg:flex">
            <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto">
              <AioaStatsPanel aioa={lastAioa} scoring={scoringObjections} />
              {liveRebuttals.length > 0 && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  <p className="text-xs font-semibold text-white">This call</p>
                  <ul className="mt-2 space-y-2">
                    {liveRebuttals.slice(0, 8).map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-2 text-xs text-slate-400"
                      >
                        <span className="truncate">{entry.objectionText}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-white">
                          {entry.overallScore}/10
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {scoredObjections.length > 0 && (
                <p className="border-t border-white/[0.06] px-4 py-3 text-xs text-slate-500">
                  {scoredObjections.length} objection{scoredObjections.length !== 1 ? "s" : ""}{" "}
                  handled this call
                </p>
              )}
            </div>
          </aside>
        )}
      </div>

      {outcomeModal === "won" && (
        <SaleClosedCelebrateModal
          feedback={
            liveRebuttals[0]?.summary ??
            lastAioa?.summary ??
            "Strong AIOA — you earned the close today."
          }
          aioa={liveRebuttals[0]?.aioa ?? lastAioa}
          onContinue={() => setOutcomeModal(null)}
          onFinish={
            canGenerateDebrief(messages)
              ? () => {
                  setOutcomeModal(null);
                  void endCallAndReview();
                }
              : undefined
          }
          onNewCall={() => {
            setOutcomeModal(null);
            startNewCall();
          }}
        />
      )}

      {outcomeModal === "hung_up" && (
        <CallOutcomeModal
          saving={debriefLoading}
          onNewCall={() => {
            setOutcomeModal(null);
            startNewCall();
          }}
          onFinish={
            canGenerateDebrief(messages)
              ? () => {
                  void endCallAndReview();
                }
              : undefined
          }
        />
      )}

      {progressionCelebration && progressionCelebration.milestones.length > 0 && (
        <ProgressionCelebrateModal
          milestones={progressionCelebration.milestones}
          level={progressionCelebration.level}
          skillTier={progressionCelebration.skillTier}
          skillTierLabel={progressionCelebration.skillTierLabel}
          xpGained={progressionCelebration.xp.total}
          onClose={() => setProgressionCelebration(null)}
        />
      )}

      {showDebrief && (
        <PracticeDebriefPanel
          debrief={debrief}
          loading={debriefLoading}
          sessionSaved={sessionSaved}
          xpEarned={xpEarned}
          simplified={agentView}
          onClose={() => setShowDebrief(false)}
          onNewCall={startNewCall}
        />
      )}
    </div>
  );
}
