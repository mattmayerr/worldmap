import { getProfile, saveProfile } from "@/lib/profile";
import type { BusinessProfile } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await getProfile();
    return Response.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<BusinessProfile>;
    const profile = await saveProfile(body as BusinessProfile);
    return Response.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile.";
    return Response.json({ error: message }, { status: 500 });
  }
}
