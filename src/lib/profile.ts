import fs from "fs/promises";
import path from "path";
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
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: BusinessProfile): Promise<BusinessProfile> {
  await ensureDataDir();
  const merged = { ...DEFAULT_PROFILE, ...profile };
  await fs.writeFile(PROFILE_PATH, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

export function formatProfileForPrompt(profile: BusinessProfile): string {
  const lines = [
    profile.businessName && `Business: ${profile.businessName}`,
    profile.productOrService && `Product/Service: ${profile.productOrService}`,
    profile.targetCustomer && `Target customer: ${profile.targetCustomer}`,
    profile.valueProposition && `Value proposition: ${profile.valueProposition}`,
    profile.commonObjections && `Common objections: ${profile.commonObjections}`,
    profile.salesStage && `Typical sales stage: ${profile.salesStage}`,
    profile.tone && `Preferred tone: ${profile.tone}`,
  ].filter(Boolean);

  return lines.length > 0
    ? lines.join("\n")
    : "No business profile configured yet. Use generic B2B sales context.";
}
