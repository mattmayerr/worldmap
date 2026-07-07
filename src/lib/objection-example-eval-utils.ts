import type { ObjectionExampleEvaluation } from "./types";
import { normalizeAioaEvaluation } from "./aioa-utils";

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 5;
  return Math.min(10, Math.max(1, Math.round(num)));
}

function dimension(raw: unknown): { score: number; summary: string } {
  const parsed = (typeof raw === "object" && raw !== null ? raw : {}) as {
    score?: unknown;
    summary?: unknown;
  };
  return {
    score: clampScore(parsed.score),
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  };
}

export function normalizeExampleEvaluation(raw: unknown): ObjectionExampleEvaluation {
  const parsed = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

  const tonality = dimension(parsed.tonality);
  const cadence = dimension(parsed.cadence);
  const wordChoiceRaw = (typeof parsed.wordChoice === "object" && parsed.wordChoice !== null
    ? parsed.wordChoice
    : {}) as Record<string, unknown>;

  const overallScore = clampScore(parsed.overallScore);
  const wouldWorkOnHuman = Boolean(parsed.wouldWorkOnHuman);

  const minDimension = Math.min(tonality.score, cadence.score, clampScore(wordChoiceRaw.score));

  const isGoodExample =
    typeof parsed.isGoodExample === "boolean"
      ? parsed.isGoodExample
      : overallScore >= 7 && wouldWorkOnHuman && minDimension >= 6;

  const improvements = Array.isArray(parsed.improvements)
    ? parsed.improvements.filter((item): item is string => typeof item === "string").slice(0, 4)
    : [];

  return {
    overallScore,
    isGoodExample,
    wouldWorkOnHuman,
    tonality,
    cadence,
    wordChoice: {
      score: clampScore(wordChoiceRaw.score),
      summary: typeof wordChoiceRaw.summary === "string" ? wordChoiceRaw.summary.trim() : "",
      strongPhrases: Array.isArray(wordChoiceRaw.strongPhrases)
        ? wordChoiceRaw.strongPhrases
            .filter((item): item is string => typeof item === "string")
            .slice(0, 4)
        : [],
      weakPhrases: Array.isArray(wordChoiceRaw.weakPhrases)
        ? wordChoiceRaw.weakPhrases
            .filter((item): item is string => typeof item === "string")
            .slice(0, 4)
        : [],
    },
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    improvements,
    aioa: normalizeAioaEvaluation(parsed.aioa),
  };
}

export function deriveReviewStatusFromEvaluation(
  evaluation: ObjectionExampleEvaluation
): "good" | "rejected" {
  const minDimension = Math.min(
    evaluation.tonality.score,
    evaluation.cadence.score,
    evaluation.wordChoice.score
  );

  const aioaOverall = evaluation.aioa?.overallScore ?? evaluation.overallScore;

  const strongEnough =
    evaluation.overallScore >= 7 &&
    evaluation.wouldWorkOnHuman &&
    minDimension >= 6 &&
    aioaOverall >= 6;

  if (evaluation.isGoodExample || strongEnough) {
    return "good";
  }

  return "rejected";
}

export function formatEvaluationFeedback(evaluation: ObjectionExampleEvaluation): string {
  const parts = [evaluation.summary];
  if (evaluation.aioa) {
    parts.push(
      `AIOA ${evaluation.aioa.overallScore}/10 — Agree ${evaluation.aioa.agree.score}, Isolate ${evaluation.aioa.isolate.score}, Overcome ${evaluation.aioa.overcome.score}, Ask ${evaluation.aioa.askForMoney.score}`
    );
  }
  if (evaluation.tonality.summary) {
    parts.push(`Tonality (${evaluation.tonality.score}/10): ${evaluation.tonality.summary}`);
  }
  if (evaluation.cadence.summary) {
    parts.push(`Cadence (${evaluation.cadence.score}/10): ${evaluation.cadence.summary}`);
  }
  if (evaluation.wordChoice.summary) {
    parts.push(`Words (${evaluation.wordChoice.score}/10): ${evaluation.wordChoice.summary}`);
  }
  if (!evaluation.wouldWorkOnHuman) {
    parts.push("Unlikely to work on a real skeptical prospect.");
  } else if (evaluation.isGoodExample || evaluation.overallScore >= 7) {
    parts.push("Strong example — added to the AI training library automatically.");
  }
  return parts.filter(Boolean).join(" ");
}
