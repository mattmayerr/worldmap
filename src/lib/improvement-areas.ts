import type {
  ObjectionExample,
  PracticeSession,
  ImprovementArea,
  ImprovementExample,
  ImprovementStatus,
} from "./types";
import { isAioaStepRelevant, isValidObjectionExample } from "./objection-turn";

export type { ImprovementArea, ImprovementStatus, ImprovementExample };

const AREA_TIPS: Record<string, string> = {
  tone: "Sound calm and confident on the phone — acknowledge concerns without being defensive or overly cheerful.",
  verbage:
    "Use plain, specific language (plan names, dollars, coverage) instead of filler or corporate jargon.",
  "objection-handling":
    "Slow down on pushback — run each objection through AIOA before you move on.",
  "aioa-agree":
    "Open with genuine acknowledgment: 'I totally understand' or 'That makes sense' before rebutting.",
  "aioa-isolate":
    "Confirm the real blocker: 'So if we take care of that, you're ready to get covered today?'",
  "aioa-overcome":
    "Use specific plan details and dollar amounts — vague promises won't move a skeptical buyer.",
  "aioa-ask":
    "End with a same-day close: ask for the card, enrollment, or setup before hanging up.",
};

const AREA_GOOD_EXAMPLES: Record<string, { title: string; body: string }> = {
  tone: {
    title: "What strong tone sounds like",
    body: "Yeah, I hear you — that's a fair point. Let me walk you through exactly what you'd get and you can tell me if it makes sense.",
  },
  verbage: {
    title: "What strong phrasing sounds like",
    body: "The Deluxe plan runs about $47 a month and covers your HVAC, plumbing, and electrical — no huge deductibles when something breaks.",
  },
  "objection-handling": {
    title: "What strong objection handling looks like",
    body: "Acknowledge their concern → isolate the real blocker → rebut with specifics → ask to enroll today on the same call.",
  },
  "aioa-agree": {
    title: "What a strong Agree step sounds like",
    body: "I totally understand — nobody wants another bill if they're not sure it's worth it.",
  },
  "aioa-isolate": {
    title: "What a strong Isolate step sounds like",
    body: "So if the monthly cost works for you, is there anything else holding you back from getting covered today?",
  },
  "aioa-overcome": {
    title: "What a strong Overcome step sounds like",
    body: "For less than a pizza a week you're covered on repairs — and we pay claims directly, no runaround.",
  },
  "aioa-ask": {
    title: "What a strong close sounds like",
    body: "Alright, let's get you set up today — I just need a card to start your coverage. Ready?",
  },
};

function statusForScore(score: number): ImprovementStatus {
  if (score >= 8) return "strong";
  if (score >= 6) return "developing";
  return "critical";
}

function roundScore(total: number, count: number): number {
  if (count === 0) return 0;
  return Math.round((total / count) * 10) / 10;
}

function pickSummary(summaries: string[]): string {
  const trimmed = summaries.map((item) => item.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return "Practice more scored calls to get detailed feedback here.";
  }
  return trimmed[0];
}

function truncate(text: string, max = 220): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function exampleId(areaId: string, index: number): string {
  return `${areaId}-${index}`;
}

interface AreaAccumulator {
  id: string;
  label: string;
  total: number;
  count: number;
  summaries: string[];
  examples: ImprovementExample[];
}

function bump(
  map: Map<string, AreaAccumulator>,
  id: string,
  label: string,
  score: number | undefined,
  summary?: string
): AreaAccumulator {
  const entry = map.get(id) ?? { id, label, total: 0, count: 0, summaries: [], examples: [] };
  if (score !== undefined && !Number.isNaN(score)) {
    entry.total += score;
    entry.count += 1;
    if (summary?.trim()) {
      entry.summaries.unshift(summary.trim());
    }
  }
  map.set(id, entry);
  return entry;
}

function pushExample(entry: AreaAccumulator, example: Omit<ImprovementExample, "id">): void {
  const duplicate = entry.examples.some(
    (item) => item.kind === example.kind && item.body === example.body
  );
  if (duplicate) return;

  entry.examples.push({
    ...example,
    id: exampleId(entry.id, entry.examples.length),
  });
}

function finalizeExamples(entry: AreaAccumulator, score: number): ImprovementExample[] {
  const weakFirst = [...entry.examples].sort((a, b) => {
    const scoreA = a.score ?? 10;
    const scoreB = b.score ?? 10;
    return scoreA - scoreB;
  });

  const picked = weakFirst.slice(0, 4);

  const good = AREA_GOOD_EXAMPLES[entry.id];
  if (good && score < 8 && !picked.some((item) => item.kind === "better-approach")) {
    picked.push({
      id: exampleId(entry.id, picked.length),
      kind: "better-approach",
      title: good.title,
      body: good.body,
    });
  }

  const tip = AREA_TIPS[entry.id];
  if (tip && score < 8 && picked.length < 5) {
    picked.push({
      id: exampleId(entry.id, picked.length),
      kind: "better-approach",
      title: "What to do next call",
      body: tip,
    });
  }

  return picked.slice(0, 5);
}

function toArea(entry: AreaAccumulator): ImprovementArea {
  const score = roundScore(entry.total, entry.count);
  return {
    id: entry.id,
    label: entry.label,
    score,
    status: statusForScore(score),
    summary: pickSummary(entry.summaries.slice(0, 3)),
    tip: AREA_TIPS[entry.id] ?? "Keep practicing this skill on your next call.",
    dataPoints: entry.count,
    examples: finalizeExamples(entry, score),
  };
}

export function computeImprovementAreas(
  sessions: PracticeSession[],
  examples: ObjectionExample[]
): ImprovementArea[] {
  const map = new Map<string, AreaAccumulator>();

  const scoredSessions = sessions
    .filter((session) => session.debrief?.overallScore !== undefined)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  for (const session of scoredSessions) {
    const debrief = session.debrief!;
    const date = session.createdAt;

    const toneEntry = bump(map, "tone", "Tone", debrief.tone?.score, debrief.tone?.summary);
    if (debrief.tone?.score !== undefined && debrief.tone.score < 8 && debrief.tone.summary) {
      pushExample(toneEntry, {
        kind: "feedback",
        title: "What we noticed on your calls",
        body: debrief.tone.summary,
        score: debrief.tone.score,
        date,
      });
    }

    const verbageEntry = bump(
      map,
      "verbage",
      "Verbage & phrasing",
      debrief.verbage?.score,
      debrief.verbage?.summary
    );
    if (debrief.verbage?.score !== undefined && debrief.verbage.score < 8) {
      if (debrief.verbage.summary) {
        pushExample(verbageEntry, {
          kind: "feedback",
          title: "What we noticed",
          body: debrief.verbage.summary,
          score: debrief.verbage.score,
          date,
        });
      }
      for (const phrase of debrief.verbage.examples?.slice(0, 2) ?? []) {
        pushExample(verbageEntry, {
          kind: "your-response",
          title: "Something you said",
          body: truncate(phrase, 180),
          score: debrief.verbage.score,
          date,
        });
      }
    }

    const objectionEntry = bump(
      map,
      "objection-handling",
      "Objection handling",
      debrief.objectionHandling?.score,
      debrief.objectionHandling?.summary
    );
    if (debrief.objectionHandling?.score !== undefined && debrief.objectionHandling.score < 8) {
      if (debrief.objectionHandling.summary) {
        pushExample(objectionEntry, {
          kind: "feedback",
          title: "What we noticed",
          body: debrief.objectionHandling.summary,
          score: debrief.objectionHandling.score,
          date,
        });
      }
      for (const note of debrief.improvements.slice(0, 2)) {
        pushExample(objectionEntry, {
          kind: "feedback",
          title: "From your debrief",
          body: note,
          score: debrief.objectionHandling.score,
          date,
        });
      }
      for (const note of debrief.missedOpportunities.slice(0, 1)) {
        pushExample(objectionEntry, {
          kind: "phrase-to-avoid",
          title: "Missed moment",
          body: note,
          score: debrief.objectionHandling.score,
          date,
        });
      }
    }
  }

  const recentExamples = examples
    .filter((example) => example.aiEvaluation?.aioa && isValidObjectionExample(example))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  const aioaSteps = [
    { key: "agree" as const, id: "aioa-agree", label: "Agree" },
    { key: "isolate" as const, id: "aioa-isolate", label: "Isolating" },
    { key: "overcome" as const, id: "aioa-overcome", label: "Overcome" },
    { key: "askForMoney" as const, id: "aioa-ask", label: "Ask for the money" },
  ];

  for (const example of recentExamples) {
    const aioa = example.aiEvaluation!.aioa!;
    const evaluation = example.aiEvaluation!;
    const date = example.createdAt;
    const prospectContext = example.prospectMessage
      ? `Prospect said: "${truncate(example.prospectMessage, 140)}"`
      : undefined;

    for (const step of aioaSteps) {
      const stepEval = aioa[step.key];
      if (!isAioaStepRelevant(step.key, aioa, evaluation.overallScore)) continue;
      if (stepEval.score >= 8) continue;

      const entry = bump(map, step.id, step.label, stepEval.score, stepEval.summary);

      pushExample(entry, {
        kind: "your-response",
        title: "Your objection response",
        body: truncate(example.agentResponse),
        context: prospectContext,
        score: stepEval.score,
        date,
      });

      if (stepEval.summary) {
        pushExample(entry, {
          kind: "feedback",
          title: `Why ${step.label.toLowerCase()} needs work`,
          body: stepEval.summary,
          score: stepEval.score,
          date,
        });
      }

      if (step.key === "overcome" || step.key === "askForMoney") {
        for (const phrase of evaluation.wordChoice?.weakPhrases?.slice(0, 1) ?? []) {
          pushExample(entry, {
            kind: "phrase-to-avoid",
            title: "Phrase that didn't land",
            body: phrase,
            score: stepEval.score,
            date,
          });
        }
      }
    }
  }

  return Array.from(map.values())
    .filter((entry) => entry.count > 0)
    .map(toArea)
    .sort((a, b) => a.score - b.score);
}

/** Weakest skills first — areas that may be hurting closes. */
export function getPriorityImprovementAreas(areas: ImprovementArea[]): ImprovementArea[] {
  return areas.filter((area) => area.status !== "strong").slice(0, 6);
}

export function getStrongestAreas(areas: ImprovementArea[]): ImprovementArea[] {
  return [...areas]
    .filter((area) => area.status === "strong")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
