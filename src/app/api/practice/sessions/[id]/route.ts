import { requireUser } from "@/lib/auth";
import { getPracticeSession } from "@/lib/practice-sessions";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const session = await getPracticeSession(params.id);

    if (!session) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.userId !== user.id && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load session.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
