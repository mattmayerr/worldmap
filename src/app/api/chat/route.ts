import { NextRequest } from "next/server";
import { buildDocumentContext } from "@/lib/documents";
import { streamChatCompletion } from "@/lib/openai";
import { getProfile } from "@/lib/profile";
import { getProfileKeywords } from "@/lib/profile-utils";
import { buildSystemPrompt } from "@/lib/prompts";
import type { ChatMessage, ChatMode } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = body.mode as ChatMode;
    const messages = body.messages as ChatMessage[];
    const prospectDirective =
      typeof body.prospectDirective === "string" ? body.prospectDirective.trim() : "";
    const practiceObjections = Array.isArray(body.practiceObjections)
      ? (body.practiceObjections as string[]).filter((item) => typeof item === "string" && item.trim())
      : undefined;

    if (mode !== "practice" && mode !== "coach" && mode !== "knowledge") {
      return Response.json(
        { error: "Invalid mode. Use 'practice', 'coach', or 'knowledge'." },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required." }, { status: 400 });
    }

    const profile = await getProfile();
    const documentContext = await buildDocumentContext(messages, getProfileKeywords(profile));
    let systemPrompt = buildSystemPrompt(mode, profile, documentContext, {
      practiceObjections,
    });
    if (mode === "practice" && prospectDirective) {
      systemPrompt = `${systemPrompt}\n\n${prospectDirective}`;
    }

    const stream = await streamChatCompletion(systemPrompt, messages, {
      temperature: mode === "practice" ? 0.8 : mode === "knowledge" ? 0.2 : 0.5,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    const status = message.includes("maximum context length") ? 400 : 500;
    const friendly =
      status === 400
        ? "This conversation is too long for the AI model. Start a new practice session (refresh the page) and try again — older messages were trimmed automatically going forward."
        : message;
    return Response.json({ error: friendly }, { status });
  }
}
