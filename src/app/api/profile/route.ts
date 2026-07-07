import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getProfile, saveProfile } from "@/lib/profile";
import type { BusinessProfile } from "@/lib/types";

export const runtime = "nodejs";

function stripAdminKnowledge(profile: BusinessProfile): BusinessProfile {
  return { ...profile, adminKnowledgeEntries: [] };
}

export async function GET() {
  try {
    const profile = await getProfile();
    const user = await getCurrentUser();
    const safeProfile =
      user?.role === "admin" ? profile : stripAdminKnowledge(profile);
    return Response.json({ profile: safeProfile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as Partial<BusinessProfile>;
    const existing = await getProfile();
    const profile = await saveProfile({
      ...existing,
      ...body,
      adminKnowledgeEntries: existing.adminKnowledgeEntries,
    });
    return Response.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile.";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
