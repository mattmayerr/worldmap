import { generatePracticeDebrief } from "@/lib/debrief";
import { getProfile } from "@/lib/profile";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body.messages as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required." }, { status: 400 });
    }

    const profile = await getProfile();
    const debrief = await generatePracticeDebrief(messages, profile);

    return Response.json({ debrief });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Debrief failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
