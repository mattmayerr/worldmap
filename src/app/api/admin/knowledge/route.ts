import { requireAdmin } from "@/lib/auth";
import {
  addAdminKnowledgeEntry,
  listAdminKnowledgeEntries,
  removeAdminKnowledgeEntry,
} from "@/lib/admin-knowledge";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const entries = await listAdminKnowledgeEntries();
    return Response.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load knowledge.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title : "";
    const content = typeof body.body === "string" ? body.body : "";

    const entries = await addAdminKnowledgeEntry(title, content);
    return Response.json({ entries, entry: entries[entries.length - 1] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add knowledge.";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Forbidden"
          ? 403
          : message === "Knowledge entry cannot be empty."
            ? 400
            : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Entry id is required." }, { status: 400 });
    }

    const entries = await removeAdminKnowledgeEntry(id);
    return Response.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove knowledge.";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Forbidden"
          ? 403
          : message === "Knowledge entry not found."
            ? 404
            : 500;
    return Response.json({ error: message }, { status });
  }
}
