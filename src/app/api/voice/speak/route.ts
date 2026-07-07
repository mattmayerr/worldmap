import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return Response.json({ error: "Text is required." }, { status: 400 });
    }

    const client = getOpenAIClient();
    const speech = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text.slice(0, 4096),
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech synthesis failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
