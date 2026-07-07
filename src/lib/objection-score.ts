import { getModel, getOpenAIClient } from "./openai";
import type { ChatMessage, ObjectionExample, ObjectionScoreResult, ObjectionTrackerItem } from "./types";

function formatGoodExamples(examples: ObjectionExample[]): string {
  if (examples.length === 0) return "";

  const lines = examples.map((example, index) => {
    return `Example ${index + 1}:
Prospect: ${example.prospectMessage}
Strong salesperson response: ${example.agentResponse}`;
  });

  return `\n\nVerified strong responses for this objection (use as calibration):\n${lines.join("\n\n")}`;
}

function formatRecentTranscript(messages: ChatMessage[], limit = 8): string {
  return messages
    .slice(-limit)
    .map((message) => {
      const speaker = message.role === "user" ? "Salesperson" : "Prospect";
      return `${speaker}: ${message.content}`;
    })
    .join("\n\n");
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 5;
  return Math.min(10, Math.max(1, Math.round(num)));
}

export function normalizeScoreResults(
  raw: unknown,
  objections: ObjectionTrackerItem[]
): ObjectionScoreResult[] {
  const parsed = (typeof raw === "object" && raw !== null ? raw : {}) as {
    results?: Array<Partial<ObjectionScoreResult>>;
  };

  if (!Array.isArray(parsed.results)) return [];

  return parsed.results
    .map((result) => {
      const match =
        objections.find((item) => item.id === result.id) ??
        objections.find(
          (item) =>
            result.text &&
            item.text.toLowerCase().includes(String(result.text).toLowerCase().slice(0, 12))
        );

      if (!match) return null;

      return {
        id: match.id,
        text: match.text,
        score: clampScore(result.score),
        feedback: typeof result.feedback === "string" ? result.feedback.trim() : "",
        addressed: Boolean(result.addressed),
        ...(result.tonalityScore !== undefined && {
          tonalityScore: clampScore(result.tonalityScore),
        }),
        ...(result.cadenceScore !== undefined && {
          cadenceScore: clampScore(result.cadenceScore),
        }),
        ...(result.wordChoiceScore !== undefined && {
          wordChoiceScore: clampScore(result.wordChoiceScore),
        }),
        ...(typeof result.wouldWorkOnHuman === "boolean" && {
          wouldWorkOnHuman: result.wouldWorkOnHuman,
        }),
      };
    })
    .filter((item): item is ObjectionScoreResult => item !== null);
}

export async function scoreObjectionTurn(
  messages: ChatMessage[],
  objections: ObjectionTrackerItem[],
  goodExamplesByObjection: Record<string, ObjectionExample[]> = {}
): Promise<ObjectionScoreResult[]> {
  if (messages.length < 2 || objections.length === 0) {
    return [];
  }

  const objectionList = objections
    .map((item, index) => {
      const examples = goodExamplesByObjection[item.id] ?? [];
      const calibration = formatGoodExamples(examples);
      return `${index + 1}. [${item.id}] "${item.text}"${calibration}`;
    })
    .join("\n");

  const client = getOpenAIClient();
  const model = getModel();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You evaluate how a salesperson handled objections in a practice call.

Judge whether the response would work on a REAL skeptical human prospect — not just whether it mentions the right facts.

Evaluate:
- **Tonality**: human, confident, empathetic — not robotic, pushy, or scripted
- **Cadence**: sounds spoken on a phone — short sentences, natural flow — not a written paragraph
- **Word choice**: specific plain language that lands with consumers — not corporate jargon

Given the recent transcript and a list of known objections, determine which objection(s) the prospect raised in the last exchange and how well the salesperson handled them.

Return JSON:
{
  "results": [
    {
      "id": "<objection id from list>",
      "text": "<objection text>",
      "score": <1-10 overall how well they handled it>,
      "feedback": "<2 sentences — cite their words, tonality/cadence/word choice verdict>",
      "addressed": <true if the salesperson clearly responded to this objection in the last turn>,
      "tonalityScore": <1-10>,
      "cadenceScore": <1-10>,
      "wordChoiceScore": <1-10>,
      "wouldWorkOnHuman": <true if a real skeptical prospect would actually soften or stay engaged>
    }
  ]
}

Scoring guide:
- 1-4: Poor — sounds scripted, pushy, or would lose the caller
- 5-6: Weak — acknowledged but stiff, vague, or wouldn't move a real person
- 7-8: Good — natural, specific, would work on most prospects
- 9-10: Excellent — sounds like a top phone rep; human, confident, persuasive

Only include objections that the prospect raised AND the salesperson responded to in the recent exchange. If none match, return { "results": [] }.`,
      },
      {
        role: "user",
        content: `Objections list:\n${objectionList}\n\nRecent transcript:\n${formatRecentTranscript(messages)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [];

  try {
    return normalizeScoreResults(JSON.parse(content), objections);
  } catch {
    return [];
  }
}
