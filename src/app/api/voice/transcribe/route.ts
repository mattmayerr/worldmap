import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof File) || audio.size === 0) {
      return Response.json({ error: "No audio recording received." }, { status: 400 });
    }

    const client = getOpenAIClient();
    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
    });

    const text = transcription.text.trim();
    if (!text) {
      return Response.json({ error: "No speech detected. Try again." }, { status: 400 });
    }

    return Response.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
