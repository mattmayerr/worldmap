import { canGenerateDebrief, filterDebriefMessages, normalizeDebrief } from "./debrief-utils";
import { getModel, getOpenAIClient } from "./openai";
import { buildDebriefPrompt } from "./prompts";
import type { BusinessProfile, ChatMessage, PracticeDebrief } from "./types";

function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      const speaker = message.role === "user" ? "Salesperson" : "Prospect";
      return `${speaker}: ${message.content}`;
    })
    .join("\n\n");
}

function parseDebrief(raw: string): PracticeDebrief {
  return normalizeDebrief(JSON.parse(raw) as unknown);
}

export async function generatePracticeDebrief(
  messages: ChatMessage[],
  profile: BusinessProfile
): Promise<PracticeDebrief> {
  const filtered = filterDebriefMessages(messages);

  if (!canGenerateDebrief(messages)) {
    throw new Error("Have at least one back-and-forth exchange before requesting a debrief.");
  }

  const client = getOpenAIClient();
  const model = getModel();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildDebriefPrompt(profile) },
      {
        role: "user",
        content: `Review this practice call transcript:\n\n${formatTranscript(filtered)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No debrief was generated.");
  }

  return parseDebrief(content);
}
