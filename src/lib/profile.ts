import fs from "fs/promises";
import path from "path";
import { normalizeAdminKnowledge } from "./admin-knowledge-utils";
import { DEFAULT_PROFILE, type BusinessProfile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getProfile(): Promise<BusinessProfile> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BusinessProfile> & { adminKnowledge?: string };
    const profile = { ...DEFAULT_PROFILE, ...parsed };
    profile.adminKnowledgeEntries = normalizeAdminKnowledge(parsed);
    return profile;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(partial: Partial<BusinessProfile>): Promise<BusinessProfile> {
  await ensureDataDir();
  const existing = await getProfile();
  const merged: BusinessProfile = {
    ...DEFAULT_PROFILE,
    ...existing,
    ...partial,
    adminKnowledgeEntries:
      partial.adminKnowledgeEntries ?? existing.adminKnowledgeEntries ?? [],
  };
  await fs.writeFile(PROFILE_PATH, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
