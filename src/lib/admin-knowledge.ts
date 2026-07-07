import { getProfile, saveProfile } from "./profile";
import { normalizeAdminKnowledge } from "./admin-knowledge-utils";
import type { AdminKnowledgeEntry } from "./types";
import { v4 as uuidv4 } from "uuid";

export { formatAdminKnowledgeForPrompt, normalizeAdminKnowledge } from "./admin-knowledge-utils";

export async function listAdminKnowledgeEntries(): Promise<AdminKnowledgeEntry[]> {
  const profile = await getProfile();
  const entries = normalizeAdminKnowledge(profile);

  if (
    entries.length > 0 &&
    (!profile.adminKnowledgeEntries || profile.adminKnowledgeEntries.length === 0)
  ) {
    await saveProfile({ ...profile, adminKnowledgeEntries: entries });
  }

  return entries;
}

export async function addAdminKnowledgeEntry(
  title: string,
  body: string
): Promise<AdminKnowledgeEntry[]> {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Knowledge entry cannot be empty.");
  }

  const profile = await getProfile();
  const entries = normalizeAdminKnowledge(profile);
  const entry: AdminKnowledgeEntry = {
    id: uuidv4(),
    title: title.trim(),
    body: trimmedBody,
    createdAt: new Date().toISOString(),
  };

  const updated = [...entries, entry];
  await saveProfile({ ...profile, adminKnowledgeEntries: updated });
  return updated;
}

export async function removeAdminKnowledgeEntry(id: string): Promise<AdminKnowledgeEntry[]> {
  const profile = await getProfile();
  const entries = normalizeAdminKnowledge(profile);
  const updated = entries.filter((entry) => entry.id !== id);

  if (updated.length === entries.length) {
    throw new Error("Knowledge entry not found.");
  }

  await saveProfile({ ...profile, adminKnowledgeEntries: updated });
  return updated;
}
