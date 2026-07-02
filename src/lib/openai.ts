import OpenAI from "openai";
import type { ChatMessage } from "./types";

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to a .env.local file. See .env.example."
    );
  }
  return new OpenAI({ apiKey });
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export async function streamChatCompletion(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const client = getOpenAIClient();
  const model = getModel();

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
