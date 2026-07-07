import type { ProfilePicture } from "./progression-types";

export type AvatarPresetId =
  | "preset-blue"
  | "preset-violet"
  | "preset-emerald"
  | "preset-amber"
  | "preset-rose"
  | "preset-cyan"
  | "preset-orange"
  | "preset-indigo";

export interface AvatarPreset {
  id: AvatarPresetId;
  name: string;
  gradient: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "preset-blue", name: "Ocean blue", gradient: "from-blue-500 to-violet-600" },
  { id: "preset-violet", name: "Violet pulse", gradient: "from-violet-500 to-fuchsia-600" },
  { id: "preset-emerald", name: "Emerald", gradient: "from-emerald-500 to-teal-600" },
  { id: "preset-amber", name: "Sunset gold", gradient: "from-amber-400 to-orange-600" },
  { id: "preset-rose", name: "Rose", gradient: "from-rose-500 to-pink-600" },
  { id: "preset-cyan", name: "Arctic cyan", gradient: "from-cyan-400 to-blue-600" },
  { id: "preset-orange", name: "Flame", gradient: "from-orange-500 to-red-600" },
  { id: "preset-indigo", name: "Midnight", gradient: "from-indigo-500 to-slate-700" },
];

export const DEFAULT_PROFILE_PICTURE: ProfilePicture = { type: "initial" };

const PRESET_MAP = new Map(AVATAR_PRESETS.map((preset) => [preset.id, preset]));

export function presetGradient(presetId: AvatarPresetId | undefined): string {
  return PRESET_MAP.get(presetId ?? "preset-blue")?.gradient ?? "from-blue-500 to-violet-600";
}

export function avatarImageUrl(profilePicture: ProfilePicture | undefined): string | null {
  if (profilePicture?.type !== "upload") return null;
  const version = profilePicture.uploadedAt ?? "1";
  return `/api/profile/avatar?v=${encodeURIComponent(version)}`;
}

export function isValidPresetId(value: string): value is AvatarPresetId {
  return PRESET_MAP.has(value as AvatarPresetId);
}

export function normalizeProfilePicture(raw: unknown): ProfilePicture {
  if (!raw || typeof raw !== "object") return DEFAULT_PROFILE_PICTURE;

  const parsed = raw as Record<string, unknown>;
  if (parsed.type === "preset" && typeof parsed.presetId === "string" && isValidPresetId(parsed.presetId)) {
    return { type: "preset", presetId: parsed.presetId };
  }

  if (parsed.type === "upload") {
    return {
      type: "upload",
      uploadedAt:
        typeof parsed.uploadedAt === "string" ? parsed.uploadedAt : new Date().toISOString(),
    };
  }

  return DEFAULT_PROFILE_PICTURE;
}
