import type { BusinessProfile, ObjectionTrackerItem } from "./types";
import type { ResolvedObjection } from "./objection-library";

export function parseObjections(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function initObjectionTracker(
  objections: ResolvedObjection[] | string[]
): ObjectionTrackerItem[] {
  const resolved: ResolvedObjection[] =
    objections.length > 0 && typeof objections[0] === "string"
      ? (objections as string[]).map((text) => ({
          id: `obj-${normalizeKey(text)}`,
          text,
          category: "resistance" as const,
          source: "profile" as const,
        }))
      : (objections as ResolvedObjection[]);

  return resolved.map((item, index) => ({
    id: item.id || `obj-${index}`,
    text: item.text,
    category: item.category,
    libraryId: item.source === "library" ? item.id : undefined,
    source: item.source,
    status: index === 0 ? "active" : "pending",
  }));
}

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

export function mergeObjectionLists(profileObjections: string[], userObjections: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const text of [...profileObjections, ...userObjections]) {
    const key = text.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(text.trim());
  }

  return merged;
}

export function buildObjectionDrillKickoff(
  profile: BusinessProfile,
  objectionText: string
): string {
  const company = profile.businessName.trim() || "the company";
  return `[OBJECTION DRILL START — WARM TRANSFER] I am a sales agent at ${company}. The customer was warm-transferred after a screener call. They are on the line and listening. After a brief intro, raise this objection naturally — skeptical but not hostile: "${objectionText}". Give them room to rebuttal with AIOA before getting off the phone.`;
}

export function buildNextObjectionPrompt(objectionText: string): string {
  return `[OBJECTION DRILL — NEXT] Warm transfer call — raise this next objection, realistic phone tone: "${objectionText}". Stay on the line and let them respond.`;
}

export function buildObjectionPracticePrompt(objectionText: string): string {
  return `[OBJECTION PRACTICE — WARM TRANSFER] The customer agreed to the transfer. Raise this objection like a real buyer who is listening but pushing back: "${objectionText}". Do not hang up — let them rebuttal.`;
}

export function applyScoreResults(
  items: ObjectionTrackerItem[],
  results: Array<{
    id: string;
    score: number;
    feedback: string;
    addressed: boolean;
  }>
): ObjectionTrackerItem[] {
  const next = items.map((item) => ({ ...item }));

  for (const result of results) {
    const index = next.findIndex((item) => item.id === result.id);
    if (index === -1 || !result.addressed) continue;

    const existing = next[index];
    const shouldUpdate =
      existing.score === undefined || result.score > existing.score;

    if (shouldUpdate) {
      next[index] = {
        ...existing,
        score: result.score,
        feedback: result.feedback,
        status: result.score >= 7 ? "scored" : "weak",
      };
    }
  }

  const activeIndex = next.findIndex((item) => item.status === "active");
  if (activeIndex >= 0 && next[activeIndex].score !== undefined) {
    next[activeIndex] = { ...next[activeIndex], status: next[activeIndex].score! >= 7 ? "scored" : "weak" };
  }

  return next;
}

export function activateNextPending(items: ObjectionTrackerItem[]): ObjectionTrackerItem[] {
  const next = items.map((item) => ({ ...item }));
  const hasActive = next.some((item) => item.status === "active");
  if (hasActive) return next;

  const pendingIndex = next.findIndex((item) => item.status === "pending");
  if (pendingIndex >= 0) {
    next[pendingIndex] = { ...next[pendingIndex], status: "active" };
  }

  return next;
}

export function setActiveObjection(
  items: ObjectionTrackerItem[],
  id: string
): ObjectionTrackerItem[] {
  return items.map((item) => ({
    ...item,
    status: item.id === id ? "active" : item.status === "active" ? "pending" : item.status,
  }));
}

export function getWeakestObjections(items: ObjectionTrackerItem[]): ObjectionTrackerItem[] {
  return items
    .filter((item) => item.score !== undefined)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
}
