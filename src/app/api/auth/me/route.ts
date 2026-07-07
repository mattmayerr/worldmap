import { getCurrentUser } from "@/lib/auth";
import { ensureBootstrapAdmin } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureBootstrapAdmin();
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ user: null });
    }

    const { passwordHash: _, ...safeUser } = user;
    return Response.json({ user: safeUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load session.";
    return Response.json({ error: message }, { status: 500 });
  }
}
