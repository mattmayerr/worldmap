import { normalizeObjectionKey } from "./objection-utils";
import type { ObjectionCategory } from "./types";

export { type ObjectionCategory };

export const OBJECTION_CATEGORY_LABELS: Record<ObjectionCategory, string> = {
  price: "Price & cost",
  need: "Don't need it",
  trust: "Trust & skepticism",
  timing: "Timing & delay",
  authority: "Approval & payment",
  resistance: "Call resistance",
  coverage: "Coverage & alternatives",
};

export const OBJECTION_CATEGORY_ORDER: ObjectionCategory[] = [
  "price",
  "need",
  "trust",
  "coverage",
  "timing",
  "authority",
  "resistance",
];

/** Curated B2C objections — warranty / protection-plan telemarketing (Assurant, F&I, B2C sales research) */
export const B2C_OBJECTION_LIBRARY: Array<{
  id: string;
  text: string;
  category: ObjectionCategory;
}> = [
  // Price & cost
  { id: "b2c-price-1", text: "The price is too high compared to what I'm buying", category: "price" },
  { id: "b2c-price-2", text: "I can't afford another monthly bill right now", category: "price" },
  { id: "b2c-price-3", text: "It's not worth the money", category: "price" },
  { id: "b2c-price-4", text: "That's more than I want to spend", category: "price" },

  // Don't need it
  { id: "b2c-need-1", text: "I don't need a warranty", category: "need" },
  { id: "b2c-need-2", text: "I'm careful with my things — nothing's going to break", category: "need" },
  { id: "b2c-need-3", text: "I'll just buy a new one if it breaks", category: "need" },
  { id: "b2c-need-4", text: "I've never needed one before", category: "need" },

  // Trust
  { id: "b2c-trust-1", text: "This sounds like a scam", category: "trust" },
  { id: "b2c-trust-2", text: "I had a bad experience with warranty companies before", category: "trust" },
  { id: "b2c-trust-3", text: "How do I know you'll actually pay claims?", category: "trust" },
  { id: "b2c-trust-4", text: "Warranties are a rip-off", category: "trust" },

  // Coverage & alternatives
  { id: "b2c-cov-1", text: "My manufacturer's warranty is enough", category: "coverage" },
  { id: "b2c-cov-2", text: "I can fix it myself", category: "coverage" },
  { id: "b2c-cov-3", text: "I'll use my own mechanic", category: "coverage" },
  { id: "b2c-cov-4", text: "Why would I need that coverage?", category: "coverage" },

  // Timing
  { id: "b2c-time-1", text: "Now is not a good time", category: "timing" },
  { id: "b2c-time-2", text: "I need to think about it", category: "timing" },
  { id: "b2c-time-3", text: "Call me back later", category: "timing" },
  { id: "b2c-time-4", text: "I'm not ready to decide today", category: "timing" },

  // Authority & payment
  { id: "b2c-auth-1", text: "I need to ask my wife first", category: "authority" },
  { id: "b2c-auth-2", text: "I don't have my credit card on me", category: "authority" },
  { id: "b2c-auth-3", text: "My husband handles these decisions", category: "authority" },
  { id: "b2c-auth-4", text: "I need to talk to my spouse before I commit", category: "authority" },

  // Call resistance
  { id: "b2c-res-1", text: "Take me off your list", category: "resistance" },
  { id: "b2c-res-2", text: "I don't have time for this", category: "resistance" },
  { id: "b2c-res-3", text: "Who gave you my number?", category: "resistance" },
  { id: "b2c-res-4", text: "No thanks, I'm good", category: "resistance" },
  { id: "b2c-res-5", text: "I'm not interested — stop calling", category: "resistance" },
];

export const DEFAULT_PRACTICE_OBJECTION_COUNT = 5;
export const SESSION_OBJECTION_HINT_COUNT = 10;

export interface ResolvedObjection {
  id: string;
  text: string;
  category: ObjectionCategory;
  source: "library" | "profile" | "personal";
}

export function getLibraryObjectionByKey(text: string): (typeof B2C_OBJECTION_LIBRARY)[number] | undefined {
  const key = normalizeObjectionKey(text);
  return B2C_OBJECTION_LIBRARY.find((item) => normalizeObjectionKey(item.text) === key);
}

export function resolveObjectionMeta(
  text: string,
  source: ResolvedObjection["source"]
): ResolvedObjection {
  const libraryMatch = getLibraryObjectionByKey(text);
  if (libraryMatch) {
    return {
      id: libraryMatch.id,
      text: libraryMatch.text,
      category: libraryMatch.category,
      source,
    };
  }

  return {
    id: `custom-${normalizeObjectionKey(text).replace(/\s+/g, "-").slice(0, 40)}`,
    text: text.trim(),
    category: "resistance",
    source,
  };
}

export function buildObjectionPool(
  profileObjections: string[],
  personalObjections: string[]
): ResolvedObjection[] {
  const seen = new Set<string>();
  const pool: ResolvedObjection[] = [];

  function add(text: string, source: ResolvedObjection["source"]) {
    const key = normalizeObjectionKey(text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    pool.push(resolveObjectionMeta(text, source));
  }

  for (const text of profileObjections) add(text, "profile");
  for (const text of personalObjections) add(text, "personal");
  for (const item of B2C_OBJECTION_LIBRARY) add(item.text, "library");

  return pool;
}

export function pickRandomObjections(
  pool: ResolvedObjection[],
  count: number = DEFAULT_PRACTICE_OBJECTION_COUNT
): ResolvedObjection[] {
  if (pool.length <= count) return [...pool];

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export { pickDiverseSessionObjections } from "./objection-rotation";

export function matchProspectMessageToObjection(
  prospectMessage: string,
  pool: ResolvedObjection[]
): ResolvedObjection | null {
  const lower = prospectMessage.toLowerCase().trim();
  if (!lower) return null;

  for (const item of pool) {
    const itemLower = item.text.toLowerCase();
    if (lower.includes(itemLower) || itemLower.includes(lower.slice(0, 40))) {
      return item;
    }
  }

  let best: { item: ResolvedObjection; score: number } | null = null;

  for (const item of pool) {
    const words = item.text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);
    const overlap = words.filter((word) => lower.includes(word)).length;
    if (overlap >= 2 && (!best || overlap > best.score)) {
      best = { item, score: overlap };
    }
  }

  return best?.item ?? null;
}

export function groupByCategory(
  items: ResolvedObjection[]
): Record<ObjectionCategory, ResolvedObjection[]> {
  const groups = Object.fromEntries(
    OBJECTION_CATEGORY_ORDER.map((category) => [category, [] as ResolvedObjection[]])
  ) as Record<ObjectionCategory, ResolvedObjection[]>;

  for (const item of items) {
    groups[item.category].push(item);
  }

  return groups;
}
