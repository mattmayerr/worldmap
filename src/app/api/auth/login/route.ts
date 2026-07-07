import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { ensureBootstrapAdmin, getUserByEmail } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureBootstrapAdmin();

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    const { passwordHash: _, ...safeUser } = user;
    return Response.json({ user: safeUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
