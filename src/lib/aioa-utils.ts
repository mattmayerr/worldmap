import type { AioaCallOutcome, AioaEvaluation, AioaStepEval, ObjectionExampleEvaluation } from "./types";

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 5;
  return Math.min(10, Math.max(1, Math.round(num)));
}

function aioaStep(raw: unknown): AioaStepEval {
  const parsed = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    score: clampScore(parsed.score),
    detected: Boolean(parsed.detected),
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  };
}

export function normalizeAioaEvaluation(raw: unknown): AioaEvaluation | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const parsed = raw as Record<string, unknown>;
  const agree = aioaStep(parsed.agree);
  const isolate = aioaStep(parsed.isolate);
  const overcome = aioaStep(parsed.overcome);
  const askForMoney = aioaStep(parsed.askForMoney);

  const overallScore = clampScore(
    parsed.overallScore ??
      (agree.score + isolate.score + overcome.score + askForMoney.score) / 4
  );

  const callOutcome =
    parsed.callOutcome === "win" || parsed.callOutcome === "hangup"
      ? parsed.callOutcome
      : "continue";

  return {
    agree,
    isolate,
    overcome,
    askForMoney,
    overallScore,
    callOutcome,
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  };
}

/** Count real agent turns (excludes [META] kickoff prompts). */
export function countAgentTurns(messages: { role: string; content: string }[]): number {
  return messages.filter(
    (message) => message.role === "user" && !message.content.trim().startsWith("[")
  ).length;
}

export interface CallOutcomeContext {
  agentTurnCount: number;
  hasObjectionContext: boolean;
}

/** Average of the four AIOA step scores. */
export function aioaAverageScore(aioa: AioaEvaluation): number {
  return Math.round(
    ((aioa.agree.score + aioa.isolate.score + aioa.overcome.score + aioa.askForMoney.score) / 4) * 10
  ) / 10;
}

/** Server-side validation of AI-recommended call outcome. */
export function deriveCallOutcome(
  evaluation: ObjectionExampleEvaluation,
  context?: CallOutcomeContext
): AioaCallOutcome {
  const aioa = evaluation.aioa;
  if (!aioa) return "continue";

  const agentTurnCount = context?.agentTurnCount ?? 1;
  const hasObjectionContext = context?.hasObjectionContext ?? true;
  const aioaAvg = aioa.overallScore;

  // AIOA average 7+ on a real objection rebuttal → prospect buys today.
  if (
    hasObjectionContext &&
    aioaAvg >= 7 &&
    evaluation.wouldWorkOnHuman
  ) {
    return "win";
  }

  // Never hang up before the agent has had room to pitch and rebuttal at least once.
  if (agentTurnCount < 2 || !hasObjectionContext) {
    return "continue";
  }

  // Hang up only on egregiously bad handling after they had a fair chance.
  const egregiousFailure =
    evaluation.overallScore <= 2 ||
    aioa.overallScore <= 2 ||
    (evaluation.overallScore <= 3 && aioa.overcome.score <= 2);

  const repeatedWeakness =
    agentTurnCount >= 3 &&
    evaluation.overallScore <= 4 &&
    aioa.overcome.score <= 3 &&
    !aioa.askForMoney.detected &&
    !evaluation.wouldWorkOnHuman;

  if (egregiousFailure || repeatedWeakness) {
    return "hangup";
  }

  return "continue";
}

/** Shown in the transcript when the prospect hangs up — no extra AI turn needed. */
export const PRACTICE_HANGUP_LINE = "Yeah, I'm gonna pass on this. *hangs up*";

export function buildProspectDirective(outcome: "win" | "hangup"): string {
  if (outcome === "win") {
    return `
## AIOA CALL OUTCOME — SALES WON (critical)
The salesperson just handled your objection well enough (AIOA average 7+/10) — you are convinced to enroll TODAY.
You are a realistic buyer who has been won over — reluctantly but genuinely — to buy coverage on this call.
- Say YES to buying in natural phone speech: "Alright, let's do it", "Okay, sign me up", "Fine, what do you need from me?", "Let's get it set up today."
- Cooperate with next steps: confirm plan, payment method, or completing enrollment now — not a callback.
- Stay in character — not overly enthusiastic, but clearly agreeing to purchase coverage today.
- Do NOT hang up. Do NOT raise a major new objection unless they completely fumble the close.
- Do NOT say "call me back" or "I'll think about it" — you agreed to buy today.
`.trim();
  }

  return `
## AIOA CALL OUTCOME — HANG UP (critical)
The salesperson has failed to handle your objection after multiple attempts, or was rude/pushy.
- You already agreed to this warm transfer — you gave them a fair chance. Now you're done.
- End the call firmly but realistically: "Nah I don't think so", "I'm gonna pass", "Alright I'm done, bye".
- Keep it brief — 1-2 sentences. Do NOT hang up mid-sentence on their first rebuttal.
`.trim();
}

export function formatAioaFeedback(aioa: AioaEvaluation): string {
  const steps = [
    { label: "Agree", step: aioa.agree },
    { label: "Isolate", step: aioa.isolate },
    { label: "Overcome", step: aioa.overcome },
    { label: "Ask", step: aioa.askForMoney },
  ];

  const parts = steps.map(
    (item) =>
      `${item.label} ${item.step.detected ? "✓" : "—"} (${item.step.score}/10)`
  );

  return `AIOA: ${parts.join(" · ")} — ${aioa.summary}`;
}

export function aioaStepLabel(step: AioaStepEval): string {
  if (step.score >= 8) return "Strong";
  if (step.score >= 6) return "OK";
  return "Weak";
}
