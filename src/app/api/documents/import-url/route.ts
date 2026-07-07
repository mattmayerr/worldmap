import { importWebsite } from "@/lib/documents";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url : "";

    if (!url.trim()) {
      return Response.json({ error: "A website URL is required." }, { status: 400 });
    }

    const document = await importWebsite(url);
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website import failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
