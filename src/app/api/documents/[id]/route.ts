import { deleteDocument } from "@/lib/documents";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const removed = await deleteDocument(params.id);
    if (!removed) {
      return Response.json({ error: "Document not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
