import type { ChatMessage, PracticeDebrief } from "./types";

const KICKOFF_PREFIX = "[START ROLE-PLAY]";

export function filterDebriefMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(
    (message) =>
      message.content.trim().length > 0 &&
      !(message.role === "user" && message.content.startsWith(KICKOFF_PREFIX))
  );
}

export function canGenerateDebrief(messages: ChatMessage[]): boolean {
  const filtered = filterDebriefMessages(messages);
  const userTurns = filtered.filter((message) => message.role === "user");
  return userTurns.length >= 1 && filtered.length >= 2;
}

function clampScore(value: unknown, fallback = 5): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(10, Math.max(1, Math.round(num)));
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export function normalizeDebrief(raw: unknown): PracticeDebrief {
  const parsed = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<PracticeDebrief>;

  return {
    overallScore: clampScore(parsed.overallScore),
    sentiment: {
      label: asString(parsed.sentiment?.label, "Mixed"),
      summary: asString(parsed.sentiment?.summary, "No sentiment summary was provided."),
    },
    tone: {
      score: clampScore(parsed.tone?.score),
      summary: asString(parsed.tone?.summary, "No tone feedback was provided."),
    },
    verbage: {
      score: clampScore(parsed.verbage?.score),
      summary: asString(parsed.verbage?.summary, "No language feedback was provided."),
      examples: asStringArray(parsed.verbage?.examples),
    },
    objectionHandling: {
      score: clampScore(parsed.objectionHandling?.score),
      summary: asString(
        parsed.objectionHandling?.summary,
        "No objection-handling feedback was provided."
      ),
    },
    strengths: asStringArray(parsed.strengths),
    improvements: asStringArray(parsed.improvements),
    missedOpportunities: asStringArray(parsed.missedOpportunities),
    nextSteps: asStringArray(parsed.nextSteps),
  };
}
