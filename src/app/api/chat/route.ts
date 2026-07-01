import { NextRequest } from "next/server";
import { buildDocumentContext } from "@/lib/documents";
import { streamChatCompletion } from "@/lib/openai";
import { getProfile, formatProfileForPrompt } from "@/lib/profile";
import { buildSystemPrompt } from "@/lib/prompts";
import type { ChatMessage, ChatMode } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = body.mode as ChatMode;
    const messages = body.messages as ChatMessage[];

    if (mode !== "practice" && mode !== "coach") {
      return Response.json({ error: "Invalid mode. Use 'practice' or 'coach'." }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required." }, { status: 400 });
    }

    const profile = await getProfile();
    const profileText = formatProfileForPrompt(profile);
    const documentContext = await buildDocumentContext();
    const systemPrompt = buildSystemPrompt(mode, profileText, documentContext);

    const stream = await streamChatCompletion(systemPrompt, messages);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
