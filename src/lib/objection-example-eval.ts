import { getModel, getOpenAIClient } from "./openai";
import { normalizeExampleEvaluation } from "./objection-example-eval-utils";
import { getProfile } from "./profile";
import { formatProfileForPrompt } from "./profile-utils";
import { formatSalesPolicyBlock } from "./sales-policy";
import type { BusinessProfile, ObjectionExampleEvaluation } from "./types";

export { deriveReviewStatusFromEvaluation, formatEvaluationFeedback } from "./objection-example-eval-utils";

export async function evaluateObjectionExample(input: {
  objectionText: string;
  prospectMessage: string;
  agentResponse: string;
  profile?: BusinessProfile;
}): Promise<ObjectionExampleEvaluation> {
  const profile = input.profile ?? (await getProfile());
  const profileText = formatProfileForPrompt(profile);
  const company = profile.businessName.trim() || "the company";

  const client = getOpenAIClient();
  const model = getModel();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert phone sales coach for ${company} (B2C warranty/protection plans).

**Call context: WARM LEAD TRANSFER** — A screener verified interest and transferred the customer to this sales agent. The customer EXPECTS this call. They are not a cold-call victim. Do NOT treat weak opening lines as hang-up-worthy — the agent needs room to pitch and rebuttal.

${formatSalesPolicyBlock(profile)}

Judge whether a salesperson's objection response would work on a REAL human who agreed to hear about coverage.

**CRITICAL — Only score AIOA when the prospect actually raised an objection and the agent is rebutting it.**
- If the prospect is only acknowledging the warm transfer ("yeah they said you'd explain the warranty") or the agent is introducing themselves / greeting / pitching without pushback, do NOT penalize missing Isolate/Overcome/Ask steps.
- In those cases set aioa.agree/isolate/overcome/askForMoney detected to false, scores to neutral (5-6), and callOutcome to "continue".

Evaluate these dimensions:

**Tonality** — Does it sound human on the phone?
- Good: calm confidence, empathetic but not groveling, matches "${profile.tone.trim() || "consultative"}"
- Bad: robotic script reading, overly cheerful, defensive, pushy, condescending, fake urgency

**Cadence** — Does it flow like natural speech?
- Good: short punchy sentences, conversational rhythm, sounds spoken not written
- Bad: long paragraphs, legalese, stacked questions, corporate brochure language, unnatural transitions

**Word choice** — Would these exact words land with a real buyer?
- Good: specific (plans, coverage, dollars), plain English, acknowledges the concern first
- Bad: jargon ("comprehensive protection solutions"), vague promises, buzzwords, filler without substance

**wouldWorkOnHuman** — Honest judgment: would a skeptical prospect soften, stay on the line, and consider the offer? Not "technically correct" — actually persuasive on a live call.

**isGoodExample** — true when this response is strong enough to train other agents: overall >= 7, wouldWorkOnHuman true, tonality/cadence/wordChoice all >= 6, and AIOA overall >= 6 when objection handling was in play. The system auto-adds good examples to the training library — no admin review.

**Training library (automatic)** — Every practice objection response is saved and classified by you. Mark isGoodExample true only for responses you'd want other agents to copy. Weak responses are discarded from training automatically.

**AIOA framework** — EverythingBreaks uses Agree, Isolate, Overcome, Ask for the money:
- **Agree**: Acknowledge the concern without being defensive ("I totally understand", "That makes sense")
- **Isolate**: Confirm the real objection is the only thing holding them back ("So if we handle that, you'd be ready to move forward?")
- **Overcome**: Strong, specific rebuttal using real plan/coverage details
- **Ask for the money**: Clear same-day close — ask for payment, enrollment, or setup TODAY ("Let's get you covered today", "Can I get a card to start?", "Ready to set this up right now?"). Penalize responses that offer callbacks or "think about it" without isolating and re-closing for today.

Score each AIOA step 1-10 and whether it was detected in the response.

**Same-day close grading** — Penalize heavily if the agent agrees to call back, sends info for later review, or fails to ask for same-day enrollment when the prospect is still engaged. Delay objections ("think about it", "call me back") require isolation and a today close — accepting delay is a weak response.

**callOutcome** recommendation for the simulated prospect's NEXT reply:
- "win" — if aioa.overallScore (average of Agree/Isolate/Overcome/Ask) is **7 or higher**, wouldWorkOnHuman is true, and the rep handled a real objection — the customer agrees to buy coverage TODAY in their next line ("okay let's do it", "alright sign me up", etc.). Same-day enrollment, not a callback.
- "hangup" — ONLY if overallScore <= 2 OR (overallScore <= 3 AND overcome <= 2) after the rep had a fair chance to rebuttal. NEVER recommend hangup on a first rebuttal attempt or a mediocre (5-6) response — use "continue" and let them try again.
- "continue" — default when AIOA average is below 7 or the rebuttal wouldn't move a real buyer. Customer stays on the line and pushes back.

Return ONLY valid JSON:
{
  "overallScore": <1-10>,
  "isGoodExample": <boolean>,
  "wouldWorkOnHuman": <boolean>,
  "tonality": { "score": <1-10>, "summary": "<1-2 sentences>" },
  "cadence": { "score": <1-10>, "summary": "<1-2 sentences>" },
  "wordChoice": {
    "score": <1-10>,
    "summary": "<1-2 sentences>",
    "strongPhrases": ["<exact phrase from agent>", "..."],
    "weakPhrases": ["<exact phrase from agent>", "..."]
  },
  "aioa": {
    "agree": { "score": <1-10>, "detected": <boolean>, "summary": "<brief>" },
    "isolate": { "score": <1-10>, "detected": <boolean>, "summary": "<brief>" },
    "overcome": { "score": <1-10>, "detected": <boolean>, "summary": "<brief>" },
    "askForMoney": { "score": <1-10>, "detected": <boolean>, "summary": "<brief>" },
    "overallScore": <1-10>,
    "callOutcome": "<continue|win|hangup>",
    "summary": "<1-2 sentences on AIOA performance>"
  },
  "summary": "<2-3 sentences — direct coaching verdict>",
  "improvements": ["<specific fix>", "..."]
}`,
      },
      {
        role: "user",
        content: `## Business context
${profileText}

## Objection raised
"${input.objectionText}"

## Prospect said
${input.prospectMessage || "(objection raised in context)"}

## Salesperson responded
${input.agentResponse}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return normalizeExampleEvaluation({
      overallScore: 5,
      isGoodExample: false,
      wouldWorkOnHuman: false,
      tonality: { score: 5, summary: "Could not evaluate." },
      cadence: { score: 5, summary: "Could not evaluate." },
      wordChoice: { score: 5, summary: "Could not evaluate.", strongPhrases: [], weakPhrases: [] },
      summary: "Evaluation unavailable.",
      improvements: [],
    });
  }

  try {
    return normalizeExampleEvaluation(JSON.parse(content));
  } catch {
    return normalizeExampleEvaluation({});
  }
}
