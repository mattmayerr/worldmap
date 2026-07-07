import { requireAdmin } from "@/lib/auth";
import { computeAdminObjectionStats } from "@/lib/objection-stats";
import { listUsers } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsers();
    const agents = users.filter((user) => user.role === "agent");
    const stats = await computeAdminObjectionStats(
      agents.map((user) => ({ id: user.id, name: user.name, email: user.email }))
    );

    return Response.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load objection stats.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
