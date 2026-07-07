import { requireUser } from "@/lib/auth";
import { addUserObjection, getUserObjections, removeUserObjection } from "@/lib/user-objections";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const objections = await getUserObjections(user.id);
    return Response.json({ objections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load objections.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text : "";

    const objections = await addUserObjection(user.id, text);
    return Response.json({ objections }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add objection.";
    const status =
      message === "Unauthorized" ? 401 : message.includes("already") ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text : "";

    const objections = await removeUserObjection(user.id, text);
    return Response.json({ objections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove objection.";
    const status = message === "Unauthorized" ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
