import { requireAdmin } from "@/lib/auth";
import { getObjectionSummary, listAllExamples } from "@/lib/objection-examples";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let examples = await listAllExamples();
    if (status === "pending") {
      examples = examples.filter((item) => item.reviewStatus === "pending");
    } else if (status === "good") {
      examples = examples.filter((item) => item.reviewStatus === "good");
    }

    const summary = getObjectionSummary(await listAllExamples());

    return Response.json({ examples, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load examples.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
