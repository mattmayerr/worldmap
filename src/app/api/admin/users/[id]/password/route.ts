import { requireAdmin } from "@/lib/auth";
import { sanitizeUser, updateUserPassword } from "@/lib/users";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    const user = await updateUserPassword(params.id, password);
    return Response.json({ user: sanitizeUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Forbidden"
          ? 403
          : message === "User not found."
            ? 404
            : message === "Password must be at least 8 characters."
              ? 400
              : 500;
    return Response.json({ error: message }, { status });
  }
}
