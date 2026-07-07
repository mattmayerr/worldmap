import { requireUser } from "@/lib/auth";
import { computeAgentStats } from "@/lib/agent-stats";
import { getProgressionSummary } from "@/lib/agent-progression";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const [stats, progression] = await Promise.all([
      computeAgentStats(user.id),
      getProgressionSummary(user.id),
    ]);
    return Response.json({ stats, progression });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stats.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
