import { requireUser } from "@/lib/auth";
import { awardSessionXp } from "@/lib/agent-progression";
import {
  listSessionsForUser,
  savePracticeSession,
  toSessionSummary,
} from "@/lib/practice-sessions";
import type { ChatMessage, ObjectionTrackerItem, PracticeDebrief } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await listSessionsForUser(user.id);
    return Response.json({
      sessions: sessions.map(toSessionSummary),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sessions.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const messages = body.messages as ChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required." }, { status: 400 });
    }

    const session = await savePracticeSession({
      userId: user.id,
      userName: user.name,
      mode: body.mode ?? "practice",
      voiceMode: Boolean(body.voiceMode),
      objectionDrill: Boolean(body.objectionDrill),
      messages,
      debrief: (body.debrief as PracticeDebrief | null) ?? null,
      objectionScores: (body.objectionScores as ObjectionTrackerItem[]) ?? [],
    });

    const award = await awardSessionXp(user.id, session);

    return Response.json(
      {
        session: toSessionSummary(session),
        xpEarned: award?.xp ?? null,
        progression: award,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save session.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
