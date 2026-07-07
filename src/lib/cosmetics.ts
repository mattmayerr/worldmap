import type { PracticeSession } from "./types";
import type { CosmeticId, EquippedCosmetics, SkillTier } from "./progression-types";
import { MAX_LEVEL, SKILL_TIER_LABELS, tierRank } from "./progression-utils";

export type CosmeticCategory = "border" | "badge" | "theme";

export type { CosmeticId };

export type UnlockRequirement =
  | { type: "free" }
  | { type: "level"; level: number }
  | { type: "skill"; tier: SkillTier }
  | { type: "streak"; days: number }
  | { type: "voice"; sessions: number }
  | { type: "prestige"; tier: number };

export interface CosmeticDefinition {
  id: CosmeticId;
  category: CosmeticCategory;
  name: string;
  description: string;
  unlock: UnlockRequirement;
  /** Elite level rewards — stronger visuals in the UI */
  prestige?: boolean;
  /** Prestige-only rewards — rugged, earned through resets */
  prestigeReward?: boolean;
}

export interface CosmeticUnlockContext {
  level: number;
  skillTier: SkillTier;
  streakDays: number;
  voiceSessionCount: number;
  improvementStreak: number;
  prestigeCount: number;
}

export interface CosmeticItemState extends CosmeticDefinition {
  unlocked: boolean;
  equipped: boolean;
  unlockLabel: string;
  levelsAway: number | null;
  prestigesAway: number | null;
}

export const COSMETIC_CATALOG: CosmeticDefinition[] = [
  {
    id: "border-starter",
    category: "border",
    name: "Starter ring",
    description: "Classic blue glow — your first frame",
    unlock: { type: "free" },
  },
  {
    id: "border-copper",
    category: "border",
    name: "Copper ring",
    description: "Warm copper pulse around your avatar",
    unlock: { type: "level", level: 2 },
  },
  {
    id: "border-emerald",
    category: "border",
    name: "Emerald ring",
    description: "Green glow for rising reps",
    unlock: { type: "level", level: 3 },
  },
  {
    id: "border-sky",
    category: "border",
    name: "Sky ring",
    description: "Bright cyan highlight frame",
    unlock: { type: "level", level: 4 },
  },
  {
    id: "border-violet",
    category: "border",
    name: "Violet ring",
    description: "Purple pulse around your avatar",
    unlock: { type: "level", level: 5 },
  },
  {
    id: "border-flame",
    category: "border",
    name: "Flame ring",
    description: "Orange-red energy border",
    unlock: { type: "level", level: 6 },
  },
  {
    id: "border-gold",
    category: "border",
    name: "Gold ring",
    description: "Warm gold frame for grinders",
    unlock: { type: "level", level: 8 },
  },
  {
    id: "border-aurora",
    category: "border",
    name: "Aurora ring",
    description: "Shifting teal-violet aurora glow",
    unlock: { type: "level", level: 9 },
  },
  {
    id: "border-platinum",
    category: "border",
    name: "Platinum ring",
    description: "Icy platinum highlight",
    unlock: { type: "level", level: 10 },
  },
  {
    id: "border-legend",
    category: "border",
    name: "Legend ring",
    description: "Rainbow-edge frame for top grinders",
    unlock: { type: "level", level: 12 },
  },
  {
    id: "border-diamond",
    category: "border",
    name: "Diamond ring",
    description: "A cold, brilliant halo — the kind only top producers wear",
    unlock: { type: "level", level: 14 },
    prestige: true,
  },
  {
    id: "border-executive",
    category: "border",
    name: "Executive ring",
    description: "Boardroom presence — people notice when you enter the room",
    unlock: { type: "level", level: 16 },
    prestige: true,
  },
  {
    id: "border-inner-circle",
    category: "border",
    name: "Inner Circle ring",
    description: "The tight ring reserved for the upper echelon",
    unlock: { type: "level", level: 18 },
    prestige: true,
  },
  {
    id: "border-hall-of-fame",
    category: "border",
    name: "Hall of Fame halo",
    description: "Immortal status — your profile commands the leaderboard",
    unlock: { type: "level", level: 20 },
    prestige: true,
  },
  {
    id: "badge-none",
    category: "badge",
    name: "No badge",
    description: "Keep your profile clean",
    unlock: { type: "free" },
  },
  {
    id: "badge-rookie",
    category: "badge",
    name: "Rookie",
    description: "You're putting in the reps",
    unlock: { type: "level", level: 2 },
  },
  {
    id: "badge-grinder",
    category: "badge",
    name: "Grinder",
    description: "Consistency pays off",
    unlock: { type: "level", level: 4 },
  },
  {
    id: "badge-veteran",
    category: "badge",
    name: "Veteran",
    description: "Seasoned on the phones",
    unlock: { type: "level", level: 7 },
  },
  {
    id: "badge-champion",
    category: "badge",
    name: "Champion",
    description: "Double-digit level earned",
    unlock: { type: "level", level: 10 },
  },
  {
    id: "badge-legend",
    category: "badge",
    name: "Legend",
    description: "Elite practice dedication",
    unlock: { type: "level", level: 12 },
  },
  {
    id: "badge-executive",
    category: "badge",
    name: "Executive",
    description: "Senior-tier status — you run the floor, not the other way around",
    unlock: { type: "level", level: 14 },
    prestige: true,
  },
  {
    id: "badge-presidents-club",
    category: "badge",
    name: "President's Club",
    description: "Same-day closers only — an exclusive club on this team",
    unlock: { type: "level", level: 16 },
    prestige: true,
  },
  {
    id: "badge-inner-circle",
    category: "badge",
    name: "Inner Circle",
    description: "The name everyone else aspires to",
    unlock: { type: "level", level: 18 },
    prestige: true,
  },
  {
    id: "badge-icon",
    category: "badge",
    name: "The Icon",
    description: "Peak status — rookies study your calls",
    unlock: { type: "level", level: 20 },
    prestige: true,
  },
  {
    id: "badge-handler",
    category: "badge",
    name: "Objection Handler",
    description: "Silver-tier objection skill",
    unlock: { type: "skill", tier: "silver" },
  },
  {
    id: "badge-closer",
    category: "badge",
    name: "Closer",
    description: "Gold-tier closing skill — money follows you",
    unlock: { type: "skill", tier: "gold" },
    prestige: true,
  },
  {
    id: "badge-elite",
    category: "badge",
    name: "Elite",
    description: "Platinum-tier performance — you're in rare air",
    unlock: { type: "skill", tier: "platinum" },
    prestige: true,
  },
  {
    id: "badge-top-producer",
    category: "badge",
    name: "Top Producer",
    description: "Volume and status — the numbers back you up",
    unlock: { type: "level", level: 15 },
    prestige: true,
  },
  {
    id: "badge-streak",
    category: "badge",
    name: "On a roll",
    description: "3-day practice streak",
    unlock: { type: "streak", days: 3 },
  },
  {
    id: "badge-voice-pro",
    category: "badge",
    name: "Voice Pro",
    description: "Five scored voice calls",
    unlock: { type: "voice", sessions: 5 },
  },
  {
    id: "theme-default",
    category: "theme",
    name: "Midnight",
    description: "Default dark portal look",
    unlock: { type: "free" },
  },
  {
    id: "theme-dusk",
    category: "theme",
    name: "Haze",
    description: "Muted violet haze with ice-blue drift",
    unlock: { type: "level", level: 2 },
  },
  {
    id: "theme-ocean",
    category: "theme",
    name: "Pacific",
    description: "Deep ocean blue colliding with royal navy",
    unlock: { type: "level", level: 5 },
  },
  {
    id: "theme-sunset",
    category: "theme",
    name: "Amber",
    description: "Burnt amber glow over warm cream",
    unlock: { type: "level", level: 6 },
  },
  {
    id: "theme-royal",
    category: "theme",
    name: "Royal",
    description: "Regal indigo punched with electric magenta",
    unlock: { type: "level", level: 7 },
  },
  {
    id: "theme-neon",
    category: "theme",
    name: "Voltage",
    description: "Neon lime and citron — full send",
    unlock: { type: "level", level: 9 },
  },
  {
    id: "theme-obsidian",
    category: "theme",
    name: "Burgundy",
    description: "Dark wine depth with a red-hot edge",
    unlock: { type: "level", level: 11 },
  },
  {
    id: "theme-emerald",
    category: "theme",
    name: "Mint",
    description: "Soft mint wash for gold-tier closers",
    unlock: { type: "skill", tier: "gold" },
  },
  {
    id: "theme-executive-suite",
    category: "theme",
    name: "Champagne",
    description: "Elite cream gold — celebration mode",
    unlock: { type: "level", level: 14 },
    prestige: true,
  },
  {
    id: "theme-black-tie",
    category: "theme",
    name: "Void",
    description: "Pure black with a spectral violet rim",
    unlock: { type: "level", level: 16 },
    prestige: true,
  },
  {
    id: "theme-platinum-lounge",
    category: "theme",
    name: "Glacier",
    description: "Icy sky blue over deep pacific",
    unlock: { type: "level", level: 18 },
    prestige: true,
  },
  {
    id: "theme-penthouse",
    category: "theme",
    name: "Pulse",
    description: "Hot magenta pulse on royal blue",
    unlock: { type: "level", level: 20 },
    prestige: true,
  },
  {
    id: "theme-corner-office",
    category: "theme",
    name: "Signal",
    description: "Alert red with a citron strike",
    unlock: { type: "skill", tier: "gold" },
    prestige: true,
  },
  {
    id: "badge-prestige-1",
    category: "badge",
    name: "Tour I",
    description: "First prestige — you reset and came back harder",
    unlock: { type: "prestige", tier: 1 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-1",
    category: "border",
    name: "Scorched ring",
    description: "Charred metal from your first full grind cycle",
    unlock: { type: "prestige", tier: 1 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-2",
    category: "badge",
    name: "Tour II",
    description: "Twice through the ringer — scar tissue and discipline",
    unlock: { type: "prestige", tier: 2 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-2",
    category: "border",
    name: "Battle-worn band",
    description: "Dented but unbroken — proof of a second tour",
    unlock: { type: "prestige", tier: 2 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-3",
    category: "badge",
    name: "Iron Hide",
    description: "Three full resets. Most people quit after one.",
    unlock: { type: "prestige", tier: 3 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-3",
    category: "border",
    name: "Iron band",
    description: "Heavy, cold steel — three tours earned",
    unlock: { type: "prestige", tier: 3 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-4",
    category: "badge",
    name: "Road Warrior",
    description: "Four tours deep. The grind is the whole point.",
    unlock: { type: "prestige", tier: 4 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-4",
    category: "border",
    name: "Carbon scar",
    description: "Blackened edge from miles of dial time",
    unlock: { type: "prestige", tier: 4 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-5",
    category: "badge",
    name: "Battle Tested",
    description: "Five resets. Still picking up the handset every day.",
    unlock: { type: "prestige", tier: 5 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-5",
    category: "border",
    name: "Tempered steel",
    description: "Hammered, quenched, and back on the phones",
    unlock: { type: "prestige", tier: 5 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-6",
    category: "badge",
    name: "Hard Earned",
    description: "Six tours. Nothing given — everything dialed.",
    unlock: { type: "prestige", tier: 6 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-6",
    category: "border",
    name: "Obsidian grit",
    description: "Volcanic glass sharpness — six cycles forged",
    unlock: { type: "prestige", tier: 6 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-7",
    category: "badge",
    name: "Steel Proof",
    description: "Seven full cycles. Built different.",
    unlock: { type: "prestige", tier: 7 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-7",
    category: "border",
    name: "Titanium mark",
    description: "Lightweight, unbreakable — seven tours deep",
    unlock: { type: "prestige", tier: 7 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-8",
    category: "badge",
    name: "Warhorse",
    description: "Eight tours. They can't break you.",
    unlock: { type: "prestige", tier: 8 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-8",
    category: "border",
    name: "War paint halo",
    description: "Crimson streaks — eight resets of raw work",
    unlock: { type: "prestige", tier: 8 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-9",
    category: "badge",
    name: "Relentless",
    description: "Nine resets. You outwork everyone on the floor.",
    unlock: { type: "prestige", tier: 9 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-9",
    category: "border",
    name: "Forge glow",
    description: "White-hot embers — nine tours of heat",
    unlock: { type: "prestige", tier: 9 },
    prestigeReward: true,
  },
  {
    id: "badge-prestige-10",
    category: "badge",
    name: "Ten-Tour Legend",
    description: "Maximum prestige. The floor knows your name.",
    unlock: { type: "prestige", tier: 10 },
    prestigeReward: true,
  },
  {
    id: "border-prestige-10",
    category: "border",
    name: "Immortal sigil",
    description: "The ultimate mark — ten full grinds completed",
    unlock: { type: "prestige", tier: 10 },
    prestigeReward: true,
  },
];

const CATALOG_BY_ID = new Map(COSMETIC_CATALOG.map((item) => [item.id, item]));

/** Temporary dev preview — set to false before production. */
export const DEV_UNLOCK_ALL_COSMETICS = false;

export const ALL_COSMETIC_IDS: CosmeticId[] = COSMETIC_CATALOG.map((item) => item.id);

export function getPrestigeUnlockIds(tier: number): CosmeticId[] {
  return COSMETIC_CATALOG.filter(
    (item) => item.unlock.type === "prestige" && item.unlock.tier === tier
  ).map((item) => item.id);
}

export const BORDER_COSMETIC_IDS = new Set<CosmeticId>(
  COSMETIC_CATALOG.filter((item) => item.category === "border").map((item) => item.id)
);

export const BADGE_COSMETIC_IDS = new Set<CosmeticId>(
  COSMETIC_CATALOG.filter((item) => item.category === "badge").map((item) => item.id)
);

export const THEME_COSMETIC_IDS = new Set<CosmeticId>(
  COSMETIC_CATALOG.filter((item) => item.category === "theme").map((item) => item.id)
);

export const DEFAULT_EQUIPPED: EquippedCosmetics = {
  avatarBorder: "border-starter",
  badge: "badge-none",
  theme: "theme-default",
};

export function getCosmeticDefinition(id: CosmeticId): CosmeticDefinition | undefined {
  return CATALOG_BY_ID.get(id);
}

function meetsRequirement(requirement: UnlockRequirement, context: CosmeticUnlockContext): boolean {
  switch (requirement.type) {
    case "free":
      return true;
    case "level":
      return context.level >= requirement.level;
    case "skill":
      return tierRank(context.skillTier) >= tierRank(requirement.tier);
    case "streak":
      return context.streakDays >= requirement.days;
    case "voice":
      return context.voiceSessionCount >= requirement.sessions;
    case "prestige":
      return context.prestigeCount >= requirement.tier;
    default:
      return false;
  }
}

export function formatUnlockLabel(requirement: UnlockRequirement): string {
  switch (requirement.type) {
    case "free":
      return "Unlocked";
    case "level":
      return `Unlocks at Level ${requirement.level}`;
    case "skill":
      return `Unlocks at ${SKILL_TIER_LABELS[requirement.tier]} skill rank`;
    case "streak":
      return `Unlocks at ${requirement.days}-day practice streak`;
    case "voice":
      return `Unlocks after ${requirement.sessions} scored voice calls`;
    case "prestige":
      return `Unlocks at Prestige ${requirement.tier}`;
    default:
      return "Locked";
  }
}

export function levelsUntilUnlock(
  requirement: UnlockRequirement,
  currentLevel: number
): number | null {
  if (requirement.type !== "level") return null;
  return Math.max(0, requirement.level - currentLevel);
}

/** Lower = earlier unlock. Levels first, then streak/voice/skill, then prestige tours. */
export function unlockSortKey(requirement: UnlockRequirement): number {
  switch (requirement.type) {
    case "free":
      return 0;
    case "level":
      return requirement.level;
    case "streak":
      return 30 + requirement.days;
    case "voice":
      return 40 + requirement.sessions;
    case "skill":
      return 50 + tierRank(requirement.tier) * 10;
    case "prestige":
      return 100 + requirement.tier;
    default:
      return 9999;
  }
}

const CATEGORY_SORT_ORDER: Record<CosmeticCategory, number> = {
  border: 0,
  badge: 1,
  theme: 2,
};

function compareCosmeticItems(a: CosmeticItemState, b: CosmeticItemState): number {
  const keyDiff = unlockSortKey(a.unlock) - unlockSortKey(b.unlock);
  if (keyDiff !== 0) return keyDiff;

  const categoryDiff = CATEGORY_SORT_ORDER[a.category] - CATEGORY_SORT_ORDER[b.category];
  if (categoryDiff !== 0) return categoryDiff;

  return a.name.localeCompare(b.name);
}

function isUnlocked(id: CosmeticId, context: CosmeticUnlockContext): boolean {
  const definition = CATALOG_BY_ID.get(id);
  if (!definition) return false;
  return meetsRequirement(definition.unlock, context);
}

export function computeUnlockedCosmetics(context: CosmeticUnlockContext): CosmeticId[] {
  if (DEV_UNLOCK_ALL_COSMETICS) {
    return ALL_COSMETIC_IDS;
  }
  return COSMETIC_CATALOG.filter((item) => isUnlocked(item.id, context)).map((item) => item.id);
}

/** Merge saved permanent unlocks with current eligibility — strips dev-preview grants. */
export function reconcileUnlockedCosmetics(
  saved: CosmeticId[],
  context: CosmeticUnlockContext
): CosmeticId[] {
  if (DEV_UNLOCK_ALL_COSMETICS) {
    return ALL_COSMETIC_IDS;
  }

  const result = new Set(computeUnlockedCosmetics(context));
  const maxLevelReached = context.prestigeCount * MAX_LEVEL + context.level;

  for (const id of saved) {
    if (result.has(id)) continue;

    const definition = CATALOG_BY_ID.get(id);
    if (!definition) continue;

    switch (definition.unlock.type) {
      case "free":
        result.add(id);
        break;
      case "level":
        if (definition.unlock.level <= maxLevelReached) {
          result.add(id);
        }
        break;
      case "prestige":
        if (context.prestigeCount >= definition.unlock.tier) {
          result.add(id);
        }
        break;
      case "skill":
      case "streak":
      case "voice":
        if (meetsRequirement(definition.unlock, context)) {
          result.add(id);
        }
        break;
    }
  }

  return Array.from(result);
}

export function isEquippedIdAllowed(id: CosmeticId | undefined, unlocked: CosmeticId[]): boolean {
  if (!id || !CATALOG_BY_ID.has(id)) return false;
  if (DEV_UNLOCK_ALL_COSMETICS) return true;
  return unlocked.includes(id);
}

export function sanitizeEquipped(
  unlocked: CosmeticId[],
  equipped: EquippedCosmetics
): EquippedCosmetics {
  const avatarBorder = isEquippedIdAllowed(equipped.avatarBorder, unlocked)
    ? equipped.avatarBorder
    : DEFAULT_EQUIPPED.avatarBorder;

  const badge = isEquippedIdAllowed(equipped.badge, unlocked)
    ? equipped.badge
    : DEFAULT_EQUIPPED.badge;

  const theme = isEquippedIdAllowed(equipped.theme, unlocked)
    ? equipped.theme
    : DEFAULT_EQUIPPED.theme;

  return { avatarBorder, badge, theme };
}

export function isCosmeticEquipped(
  item: Pick<CosmeticItemState, "id" | "category">,
  equipped: EquippedCosmetics
): boolean {
  if (item.category === "border") return equipped.avatarBorder === item.id;
  if (item.category === "badge") return equipped.badge === item.id;
  return equipped.theme === item.id;
}

export function prestigesUntilUnlock(
  requirement: UnlockRequirement,
  currentPrestigeCount: number
): number | null {
  if (requirement.type !== "prestige") return null;
  return Math.max(0, requirement.tier - currentPrestigeCount);
}

export function buildCosmeticItemStates(
  unlocked: CosmeticId[],
  equipped: EquippedCosmetics,
  currentLevel: number,
  currentPrestigeCount: number
): CosmeticItemState[] {
  const unlockedSet = new Set(unlocked);

  return COSMETIC_CATALOG.map((item) => {
    const isUnlocked = DEV_UNLOCK_ALL_COSMETICS || unlockedSet.has(item.id);
    return {
      ...item,
      unlocked: isUnlocked,
      equipped:
        (item.category === "border" && equipped.avatarBorder === item.id) ||
        (item.category === "badge" && equipped.badge === item.id) ||
        (item.category === "theme" && equipped.theme === item.id),
      unlockLabel: formatUnlockLabel(item.unlock),
      levelsAway: isUnlocked ? null : levelsUntilUnlock(item.unlock, currentLevel),
      prestigesAway: isUnlocked ? null : prestigesUntilUnlock(item.unlock, currentPrestigeCount),
    };
  }).sort(compareCosmeticItems);
}

export function getNextLevelUnlocks(
  items: CosmeticItemState[],
  currentLevel: number
): CosmeticItemState[] {
  const lockedLevelItems = items.filter(
    (item) => !item.unlocked && item.unlock.type === "level"
  ) as Array<CosmeticItemState & { unlock: { type: "level"; level: number } }>;

  const nextLevel = lockedLevelItems
    .map((item) => item.unlock.level)
    .filter((level) => level > currentLevel)
    .sort((a, b) => a - b)[0];

  if (nextLevel === undefined) return [];

  return lockedLevelItems.filter((item) => item.unlock.level === nextLevel);
}

function cosmeticDefinition(id: CosmeticId | undefined): CosmeticDefinition | undefined {
  if (!id) return undefined;
  return CATALOG_BY_ID.get(id);
}

/** Whether this border uses the rotating conic-gradient flow ring. */
export function avatarBorderUsesFlowRing(borderId: CosmeticId | undefined): boolean {
  const def = cosmeticDefinition(borderId);
  if (!def || def.category !== "border") return false;
  return def.prestige === true || def.prestigeReward === true;
}

/** Flow ring wrapper class — elite vs prestige tour styling. */
export function avatarBorderAnimationClass(borderId: CosmeticId | undefined): string {
  const def = cosmeticDefinition(borderId);
  if (!def || def.category !== "border") return "";
  if (def.prestigeReward) return "cosmetic-ring-flow-prestige";
  if (def.prestige) return "cosmetic-ring-flow-elite";
  return "";
}

/** CSS custom properties for per-ring flow colors. */
export function avatarBorderFlowStyle(
  borderId: CosmeticId | undefined
): Record<string, string> | undefined {
  if (!avatarBorderUsesFlowRing(borderId)) return undefined;

  switch (borderId) {
    case "border-diamond":
      return { "--ring-a": "#ffffff", "--ring-b": "#67e8f9", "--ring-c": "#e879f9" };
    case "border-executive":
      return { "--ring-a": "#fcd34d", "--ring-b": "#f59e0b", "--ring-c": "#fef3c7" };
    case "border-inner-circle":
      return { "--ring-a": "#c4b5fd", "--ring-b": "#8b5cf6", "--ring-c": "#ddd6fe" };
    case "border-hall-of-fame":
      return { "--ring-a": "#fde68a", "--ring-b": "#f472b6", "--ring-c": "#fef08a" };
    case "border-prestige-1":
    case "border-prestige-2":
      return { "--ring-a": "#a8a29e", "--ring-b": "#78716c", "--ring-c": "#d6d3d1" };
    case "border-prestige-3":
    case "border-prestige-4":
      return { "--ring-a": "#94a3b8", "--ring-b": "#64748b", "--ring-c": "#cbd5e1" };
    case "border-prestige-5":
    case "border-prestige-6":
      return { "--ring-a": "#d6d3d1", "--ring-b": "#57534e", "--ring-c": "#e7e5e4" };
    case "border-prestige-7":
    case "border-prestige-8":
      return { "--ring-a": "#fca5a5", "--ring-b": "#b91c1c", "--ring-c": "#fecaca" };
    case "border-prestige-9":
      return { "--ring-a": "#fb923c", "--ring-b": "#ea580c", "--ring-c": "#fdba74" };
    case "border-prestige-10":
      return { "--ring-a": "#fde68a", "--ring-b": "#ef4444", "--ring-c": "#fef3c7" };
    default:
      return { "--ring-a": "#fbbf24", "--ring-b": "#a78bfa", "--ring-c": "#fcd34d" };
  }
}

/** Shimmer animation for elite and prestige badges. */
export function badgeAnimationClass(badgeId: CosmeticId | undefined): string {
  const def = cosmeticDefinition(badgeId);
  if (!def || def.category !== "badge" || badgeId === "badge-none") return "";
  if (def.prestigeReward) return "cosmetic-badge-prestige";
  if (def.prestige) return "cosmetic-badge-elite";
  return "";
}

/** Aurora overlay animation for elite and prestige page themes. */
export function pageThemeAnimationClass(themeId: CosmeticId | undefined): string {
  const def = cosmeticDefinition(themeId);
  if (!def || def.category !== "theme") return "";
  if (def.prestigeReward) return "cosmetic-theme-prestige-animated";
  if (def.prestige) return "cosmetic-theme-elite-animated";
  return "";
}

export function avatarBorderClass(borderId: CosmeticId | undefined): string {
  const base = "ring-offset-2 ring-offset-surface";
  switch (borderId) {
    case "border-copper":
      return `${base} ring-[4px] ring-orange-400/90 shadow-[0_0_14px_rgba(251,146,60,0.45)]`;
    case "border-emerald":
      return `${base} ring-[4px] ring-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.45)]`;
    case "border-sky":
      return `${base} ring-[4px] ring-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]`;
    case "border-violet":
      return `${base} ring-[4px] ring-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.45)]`;
    case "border-flame":
      return `${base} ring-[4px] ring-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.5)]`;
    case "border-gold":
      return `${base} ring-[4px] ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.45)]`;
    case "border-aurora":
      return `${base} ring-[4px] ring-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.55)]`;
    case "border-platinum":
      return `${base} ring-[4px] ring-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.5)]`;
    case "border-legend":
      return `${base} ring-[4px] ring-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.55)]`;
    case "border-diamond":
      return `${base} ring-[5px] ring-white/90 shadow-[0_0_20px_rgba(255,255,255,0.4),0_0_32px_rgba(56,189,248,0.4)]`;
    case "border-executive":
      return `${base} ring-[5px] ring-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.55)]`;
    case "border-inner-circle":
      return `${base} ring-[5px] ring-violet-300 shadow-[0_0_24px_rgba(167,139,250,0.6)]`;
    case "border-hall-of-fame":
      return `${base} ring-[5px] ring-yellow-200 shadow-[0_0_26px_rgba(250,204,21,0.6),0_0_40px_rgba(244,114,182,0.3)]`;
    case "border-prestige-1":
      return `${base} ring-[5px] ring-stone-500 shadow-[0_0_16px_rgba(120,113,108,0.6)]`;
    case "border-prestige-2":
      return `${base} ring-[5px] ring-zinc-400 shadow-[0_0_18px_rgba(161,161,170,0.55)]`;
    case "border-prestige-3":
      return `${base} ring-[5px] ring-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.6)]`;
    case "border-prestige-4":
      return `${base} ring-[5px] ring-neutral-600 shadow-[0_0_20px_rgba(82,82,82,0.65)]`;
    case "border-prestige-5":
      return `${base} ring-[5px] ring-stone-300 shadow-[0_0_22px_rgba(214,211,209,0.55)]`;
    case "border-prestige-6":
      return `${base} ring-[5px] ring-gray-800 shadow-[0_0_24px_rgba(31,41,55,0.75)]`;
    case "border-prestige-7":
      return `${base} ring-[5px] ring-slate-200 shadow-[0_0_24px_rgba(226,232,240,0.5)]`;
    case "border-prestige-8":
      return `${base} ring-[5px] ring-red-700 shadow-[0_0_26px_rgba(185,28,28,0.65)]`;
    case "border-prestige-9":
      return `${base} ring-[5px] ring-orange-400 shadow-[0_0_28px_rgba(251,146,60,0.7)]`;
    case "border-prestige-10":
      return `${base} ring-[5px] ring-amber-200 shadow-[0_0_30px_rgba(253,230,138,0.6),0_0_44px_rgba(239,68,68,0.4)]`;
    case "border-starter":
    default:
      return `${base} ring-[4px] ring-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.35)]`;
  }
}

export function badgeLabel(badgeId: CosmeticId | undefined): string | null {
  switch (badgeId) {
    case "badge-rookie":
      return "Rookie";
    case "badge-grinder":
      return "Grinder";
    case "badge-veteran":
      return "Veteran";
    case "badge-champion":
      return "Champion";
    case "badge-legend":
      return "Legend";
    case "badge-executive":
      return "Executive";
    case "badge-presidents-club":
      return "Pres Club";
    case "badge-inner-circle":
      return "Inner Circle";
    case "badge-icon":
      return "The Icon";
    case "badge-top-producer":
      return "Top Producer";
    case "badge-handler":
      return "Handler";
    case "badge-closer":
      return "Closer";
    case "badge-elite":
      return "Elite";
    case "badge-streak":
      return "On a roll";
    case "badge-voice-pro":
      return "Voice Pro";
    case "badge-prestige-1":
      return "Tour I";
    case "badge-prestige-2":
      return "Tour II";
    case "badge-prestige-3":
      return "Iron Hide";
    case "badge-prestige-4":
      return "Road Warrior";
    case "badge-prestige-5":
      return "Battle Tested";
    case "badge-prestige-6":
      return "Hard Earned";
    case "badge-prestige-7":
      return "Steel Proof";
    case "badge-prestige-8":
      return "Warhorse";
    case "badge-prestige-9":
      return "Relentless";
    case "badge-prestige-10":
      return "Ten-Tour";
    default:
      return null;
  }
}

export function badgeClass(badgeId: CosmeticId | undefined): string {
  switch (badgeId) {
    case "badge-rookie":
      return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    case "badge-grinder":
      return "border-orange-500/30 bg-orange-500/10 text-orange-200";
    case "badge-veteran":
      return "border-violet-500/30 bg-violet-500/10 text-violet-200";
    case "badge-champion":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "badge-legend":
      return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";
    case "badge-executive":
      return "border-amber-400/40 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/20";
    case "badge-presidents-club":
      return "border-yellow-400/40 bg-yellow-500/15 text-yellow-100 ring-1 ring-yellow-400/25";
    case "badge-inner-circle":
      return "border-violet-300/40 bg-violet-500/15 text-violet-100 ring-1 ring-violet-300/25";
    case "badge-icon":
      return "border-fuchsia-300/40 bg-gradient-to-r from-fuchsia-500/20 to-amber-500/20 text-white ring-1 ring-fuchsia-300/30";
    case "badge-top-producer":
      return "border-amber-300/40 bg-amber-400/15 text-amber-50 ring-1 ring-amber-300/30";
    case "badge-handler":
      return "border-slate-400/30 bg-slate-400/10 text-slate-200";
    case "badge-closer":
      return "border-amber-500/40 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/20";
    case "badge-elite":
      return "border-cyan-300/40 bg-cyan-500/15 text-cyan-50 ring-1 ring-cyan-300/30";
    case "badge-streak":
      return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    case "badge-voice-pro":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "badge-prestige-1":
    case "badge-prestige-2":
      return "border-stone-500/50 bg-stone-700/30 text-stone-200 ring-1 ring-stone-500/30";
    case "badge-prestige-3":
    case "badge-prestige-4":
      return "border-slate-400/50 bg-slate-700/35 text-slate-100 ring-1 ring-slate-400/35";
    case "badge-prestige-5":
    case "badge-prestige-6":
      return "border-zinc-300/45 bg-zinc-800/40 text-zinc-100 ring-1 ring-zinc-400/30";
    case "badge-prestige-7":
    case "badge-prestige-8":
      return "border-red-800/50 bg-red-950/40 text-red-100 ring-1 ring-red-700/35";
    case "badge-prestige-9":
      return "border-orange-500/50 bg-orange-950/45 text-orange-100 ring-1 ring-orange-500/40";
    case "badge-prestige-10":
      return "border-amber-300/55 bg-gradient-to-r from-red-950/50 to-amber-950/50 text-amber-100 ring-1 ring-amber-400/45";
    default:
      return "";
  }
}

export { pageThemeClass, themePreviewStyle } from "./color-themes";

function sessionHadImprovement(session: PracticeSession, priorSessions: PracticeSession[]): boolean {
  if (!session.debrief) return false;

  const priorScored = priorSessions
    .filter((item) => item.id !== session.id && item.debrief?.overallScore !== undefined)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (priorScored.length < 2) return false;

  const priorAvg =
    priorScored.reduce((sum, item) => sum + (item.debrief?.overallScore ?? 0), 0) / priorScored.length;

  return session.debrief.overallScore >= priorAvg + 0.5;
}

export function computeImprovementStreak(sessions: PracticeSession[]): number {
  const scored = sessions
    .filter((session) => session.debrief?.overallScore !== undefined)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  let streak = 0;
  for (let index = 0; index < scored.length; index += 1) {
    const prior = scored.slice(index + 1);
    if (sessionHadImprovement(scored[index], prior)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function countVoiceScoredSessions(sessions: PracticeSession[]): number {
  return sessions.filter(
    (session) => session.voiceMode && session.debrief?.overallScore !== undefined
  ).length;
}

export function buildUnlockContext(
  level: number,
  skillTier: SkillTier,
  streakDays: number,
  sessions: PracticeSession[],
  prestigeCount = 0
): CosmeticUnlockContext {
  return {
    level,
    skillTier,
    streakDays,
    voiceSessionCount: countVoiceScoredSessions(sessions),
    improvementStreak: computeImprovementStreak(sessions),
    prestigeCount,
  };
}
