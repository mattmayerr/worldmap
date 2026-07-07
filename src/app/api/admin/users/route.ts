import { requireAdmin } from "@/lib/auth";
import { createUser, listUsers, sanitizeUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsers();
    return Response.json({
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    const user = await createUser({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name ?? "",
      role: body.role === "admin" ? "admin" : "agent",
    });

    return Response.json({ user: sanitizeUser(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
