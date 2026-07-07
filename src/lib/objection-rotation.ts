import type { ObjectionCategory } from "./types";
import type { ResolvedObjection } from "./objection-library";
import { OBJECTION_CATEGORY_LABELS, OBJECTION_CATEGORY_ORDER } from "./objection-library";

const AUTHORITY_CATEGORY: ObjectionCategory = "authority";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Pick session hints with one objection per category first — avoids 4 spouse variants in one call. */
export function pickDiverseSessionObjections(
  pool: ResolvedObjection[],
  count: number
): ResolvedObjection[] {
  if (pool.length <= count) return shuffle([...pool]);

  const byCategory = Object.fromEntries(
    OBJECTION_CATEGORY_ORDER.map((category) => [category, [] as ResolvedObjection[]])
  ) as Record<ObjectionCategory, ResolvedObjection[]>;

  for (const item of pool) {
    byCategory[item.category].push(item);
  }

  for (const category of OBJECTION_CATEGORY_ORDER) {
    byCategory[category] = shuffle(byCategory[category]);
  }

  const picked: ResolvedObjection[] = [];
  const usedKeys = new Set<string>();

  function add(item: ResolvedObjection) {
    if (usedKeys.has(item.id)) return;
    usedKeys.add(item.id);
    picked.push(item);
  }

  // One from each category first (max 1 authority/spouse-type per session batch).
  for (const category of OBJECTION_CATEGORY_ORDER) {
    if (picked.length >= count) break;
    const candidate = byCategory[category][0];
    if (candidate) add(candidate);
  }

  const remaining = shuffle(pool.filter((item) => !usedKeys.has(item.id)));
  for (const item of remaining) {
    if (picked.length >= count) break;
    if (item.category === AUTHORITY_CATEGORY && picked.some((entry) => entry.category === AUTHORITY_CATEGORY)) {
      continue;
    }
    add(item);
  }

  return shuffle(picked).slice(0, count);
}

export function pickNextObjectionHint(
  sessionHints: ResolvedObjection[],
  handled: ResolvedObjection[]
): ResolvedObjection | null {
  const handledIds = new Set(handled.map((item) => item.id));
  const handledCategories = new Set(handled.map((item) => item.category));
  const lastCategory = handled[handled.length - 1]?.category;

  const unused = sessionHints.filter((item) => !handledIds.has(item.id));
  if (unused.length === 0) return null;

  const differentCategory = unused.filter(
    (item) => item.category !== lastCategory && !handledCategories.has(item.category)
  );
  if (differentCategory.length > 0) {
    return differentCategory[Math.floor(Math.random() * differentCategory.length)];
  }

  const notSameAsLast = unused.filter((item) => item.category !== lastCategory);
  if (notSameAsLast.length > 0) {
    return notSameAsLast[Math.floor(Math.random() * notSameAsLast.length)];
  }

  return unused[Math.floor(Math.random() * unused.length)];
}

export function buildObjectionRotationDirective(input: {
  handledObjections: ResolvedObjection[];
  sessionHints: ResolvedObjection[];
  lastScore?: number;
}): string {
  const { handledObjections, sessionHints, lastScore } = input;
  if (handledObjections.length === 0) return "";

  const last = handledObjections[handledObjections.length - 1];
  const nextHint = pickNextObjectionHint(sessionHints, handledObjections);
  const handledWell = typeof lastScore === "number" && lastScore >= 6;
  const usedCategories = Array.from(
    new Set(handledObjections.map((item) => OBJECTION_CATEGORY_LABELS[item.category]))
  );

  const lines = [
    "## OBJECTION ROTATION — your next response (critical)",
    "Real buyers do NOT hammer the same objection forever. They switch tactics, smokescreen, or reveal the real concern once the rep handles the first pushback.",
    "",
    `Objections you already raised this call (do NOT repeat these or the same theme):`,
    ...handledObjections.map((item) => `- "${item.text}" (${OBJECTION_CATEGORY_LABELS[item.category]})`),
    "",
    handledWell
      ? "The rep handled your last pushback reasonably well. Ease up on that specific angle — do NOT double down on it."
      : "The rep's rebuttal was weak, but stay on the line. You may push back once more on a related point, then switch to a different objection type.",
    "",
    "Rules for your NEXT line:",
    `- Use a **different objection category** than "${OBJECTION_CATEGORY_LABELS[last.category]}". Categories already used: ${usedCategories.join(", ") || "none"}.`,
  ];

  if (last.category === AUTHORITY_CATEGORY) {
    lines.push(
      "- You used spouse/approval as a delay — classic smokescreen. If they isolated well, your REAL concern is probably price, value, or trust. Show that now (e.g. cost, not worth it, scam worry) — do NOT mention wife/husband/spouse again."
    );
  }

  if (last.category === "timing") {
    lines.push(
      "- You raised a timing/delay objection. If they isolate and push for same-day enrollment, soften — this company closes on the call, not via callback."
    );
  }

  if (nextHint) {
    lines.push(
      `- New angle for this turn (paraphrase naturally, don't read verbatim): "${nextHint.text}" (${OBJECTION_CATEGORY_LABELS[nextHint.category]})`
    );
  } else {
    lines.push(
      "- Pick a fresh angle: price/cost, don't need it, bad timing, trust/scam concern, or coverage doubt — whichever you haven't used yet."
    );
  }

  lines.push(
    "- Never repeat the exact same objection twice in one call unless the rep completely ignored you.",
    "- Keep it 1-3 sentences of natural phone speech."
  );

  return lines.join("\n");
}
