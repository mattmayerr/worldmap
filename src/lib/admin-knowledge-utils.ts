import { v4 as uuidv4 } from "uuid";
import type { AdminKnowledgeEntry, BusinessProfile } from "./types";

type ProfileWithLegacy = Partial<BusinessProfile> & { adminKnowledge?: string };

export function normalizeAdminKnowledge(source: ProfileWithLegacy): AdminKnowledgeEntry[] {
  if (source.adminKnowledgeEntries && source.adminKnowledgeEntries.length > 0) {
    return source.adminKnowledgeEntries;
  }

  const legacy = source.adminKnowledge?.trim();
  if (!legacy) return [];

  return [
    {
      id: uuidv4(),
      title: "General",
      body: legacy,
      createdAt: new Date().toISOString(),
    },
  ];
}

/** Total admin knowledge injected into the model per request */
const MAX_ADMIN_KNOWLEDGE_PROMPT_CHARS = 10_000;

/** Cap per entry so one pasted PDF cannot dominate the prompt */
const MAX_ADMIN_KNOWLEDGE_ENTRY_CHARS = 2_500;

export function formatAdminKnowledgeForPrompt(entries: AdminKnowledgeEntry[]): string {
  if (entries.length === 0) return "";

  const parts: string[] = [];
  let remaining = MAX_ADMIN_KNOWLEDGE_PROMPT_CHARS;

  for (const entry of entries) {
    const title = entry.title.trim();
    let body = entry.body.trim();
    if (!body && !title) continue;

    if (body.length > MAX_ADMIN_KNOWLEDGE_ENTRY_CHARS) {
      body = `${body.slice(0, MAX_ADMIN_KNOWLEDGE_ENTRY_CHARS)}\n[…entry trimmed for length…]`;
    }

    const block = title && body ? `**${title}**\n${body}` : body || title;
    if (block.length > remaining) {
      if (remaining > 120) {
        parts.push(
          `${block.slice(0, remaining - 80)}\n[…admin knowledge truncated for model length…]`
        );
      }
      break;
    }

    parts.push(block);
    remaining -= block.length + 2;
  }

  return parts.join("\n\n");
}
