import { listDocuments, saveDocument } from "@/lib/documents";

export const runtime = "nodejs";

export async function GET() {
  try {
    const documents = await listDocuments();
    return Response.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list documents.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await saveDocument(file.name, buffer);

    return Response.json({ document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
