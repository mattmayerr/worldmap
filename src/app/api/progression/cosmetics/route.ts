import { requireUser } from "@/lib/auth";
import { getProgressionSummary, updateAgentProfile } from "@/lib/agent-progression";
import {
  BADGE_COSMETIC_IDS,
  BORDER_COSMETIC_IDS,
  getCosmeticDefinition,
  THEME_COSMETIC_IDS,
} from "@/lib/cosmetics";
import type { CosmeticId, EquippedCosmetics } from "@/lib/progression-types";

export const runtime = "nodejs";

/** @deprecated Use GET /api/profile/agent */
export async function GET() {
  try {
    const user = await requireUser();
    const progression = await getProgressionSummary(user.id);
    return Response.json({ progression });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cosmetics.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

/** @deprecated Use PATCH /api/profile/agent */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const equipped = parseEquipped(body.equipped);

    if (!equipped) {
      return Response.json({ error: "Invalid equipped cosmetics." }, { status: 400 });
    }

    for (const value of Object.values(equipped)) {
      if (value && !getCosmeticDefinition(value)) {
        return Response.json({ error: "Unknown cosmetic." }, { status: 400 });
      }
    }

    await updateAgentProfile(user.id, { equipped });
    const progression = await getProgressionSummary(user.id);
    return Response.json({ progression });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update cosmetics.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

function parseEquipped(body: unknown): EquippedCosmetics | null {
  if (!body || typeof body !== "object") return null;

  const parsed = body as Record<string, unknown>;
  const equipped: EquippedCosmetics = {};

  if (typeof parsed.avatarBorder === "string" && BORDER_COSMETIC_IDS.has(parsed.avatarBorder as CosmeticId)) {
    equipped.avatarBorder = parsed.avatarBorder as CosmeticId;
  }
  if (typeof parsed.badge === "string" && BADGE_COSMETIC_IDS.has(parsed.badge as CosmeticId)) {
    equipped.badge = parsed.badge as CosmeticId;
  }
  if (typeof parsed.theme === "string" && THEME_COSMETIC_IDS.has(parsed.theme as CosmeticId)) {
    equipped.theme = parsed.theme as CosmeticId;
  }

  if (
    equipped.avatarBorder === undefined &&
    equipped.badge === undefined &&
    equipped.theme === undefined
  ) {
    return null;
  }

  return equipped;
}
