import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/agent-progression";
import type { LeaderboardSort } from "@/lib/progression-types";

export const runtime = "nodejs";

function parseSort(value: string | null): LeaderboardSort {
  return value === "skill" ? "skill" : "level";
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const sort = parseSort(searchParams.get("sort"));
    const leaderboard = await getLeaderboard(user.id, sort);
    return Response.json(leaderboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load leaderboard.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
