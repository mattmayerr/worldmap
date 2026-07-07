import { requireAdmin } from "@/lib/auth";
import { computeTeamMetrics } from "@/lib/practice-sessions";
import { listUsers, sanitizeUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsers();
    const agents = users.filter((user) => user.role === "agent");
    const metrics = await computeTeamMetrics(
      agents.map((user) => ({ id: user.id, name: user.name, email: user.email }))
    );

    return Response.json({ metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load metrics.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST() {
  return GET();
}
