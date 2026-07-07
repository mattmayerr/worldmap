import { requireUser } from "@/lib/auth";
import { getProgressionSummary, updateAgentProfile } from "@/lib/agent-progression";
import { normalizeProfilePicture, isValidPresetId } from "@/lib/avatar";
import {
  BADGE_COSMETIC_IDS,
  BORDER_COSMETIC_IDS,
  getCosmeticDefinition,
  THEME_COSMETIC_IDS,
} from "@/lib/cosmetics";
import type { CosmeticId, EquippedCosmetics, ProfilePicture } from "@/lib/progression-types";
import { sanitizeUser } from "@/lib/users";

export const runtime = "nodejs";

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

function parseProfilePicture(body: unknown): ProfilePicture | null {
  if (!body || typeof body !== "object") return null;

  const parsed = body as Record<string, unknown>;
  if (parsed.type === "initial") {
    return { type: "initial" };
  }

  if (
    parsed.type === "preset" &&
    typeof parsed.presetId === "string" &&
    isValidPresetId(parsed.presetId)
  ) {
    return { type: "preset", presetId: parsed.presetId };
  }

  if (parsed.type === "upload") {
    return normalizeProfilePicture(parsed);
  }

  return null;
}

export async function GET() {
  try {
    const user = await requireUser();
    const progression = await getProgressionSummary(user.id);
    return Response.json({
      user: sanitizeUser(user),
      progression,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const equipped = body.equipped ? parseEquipped(body.equipped) : null;
    const profilePicture = body.profilePicture ? parseProfilePicture(body.profilePicture) : null;

    if (!equipped && !profilePicture) {
      return Response.json({ error: "Nothing to update." }, { status: 400 });
    }

    if (equipped) {
      for (const value of Object.values(equipped)) {
        if (value && !getCosmeticDefinition(value)) {
          return Response.json({ error: "Unknown cosmetic." }, { status: 400 });
        }
      }
    }

    await updateAgentProfile(user.id, {
      equipped: equipped ?? undefined,
      profilePicture: profilePicture ?? undefined,
    });

    const progression = await getProgressionSummary(user.id);
    return Response.json({
      user: sanitizeUser(user),
      progression,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
