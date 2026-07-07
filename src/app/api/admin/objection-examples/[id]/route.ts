import { requireAdmin } from "@/lib/auth";
import { updateExampleReview } from "@/lib/objection-examples";
import type { ObjectionExampleReviewStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const reviewStatus = body.reviewStatus as ObjectionExampleReviewStatus;

    if (!["good", "rejected", "pending"].includes(reviewStatus)) {
      return Response.json({ error: "Invalid review status." }, { status: 400 });
    }

    const updated = await updateExampleReview(params.id, {
      reviewStatus,
      reviewedBy: admin.id,
      adminNotes: typeof body.adminNotes === "string" ? body.adminNotes : undefined,
    });

    if (!updated) {
      return Response.json({ error: "Example not found." }, { status: 404 });
    }

    return Response.json({ example: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update example.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
