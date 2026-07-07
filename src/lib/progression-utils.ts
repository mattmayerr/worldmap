import type { SkillTier } from "./progression-types";

/** Cumulative XP required to reach each level (index 0 = level 1). */
export const LEVEL_XP_THRESHOLDS = [
  0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400, 6500, 7600, 8700, 9800, 10900, 12000, 13100,
  14200, 15300, 16400,
];

export const MAX_LEVEL = LEVEL_XP_THRESHOLDS.length;
export const MAX_PRESTIGE = 10;

export const MIN_SCORED_SESSIONS_FOR_SKILL = 3;

export const SKILL_TIER_LABELS: Record<SkillTier, string> = {
  calibrating: "Calibrating",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export function xpToLevel(xp: number): number {
  let level = 1;
  for (let index = 0; index < LEVEL_XP_THRESHOLDS.length; index += 1) {
    if (xp >= LEVEL_XP_THRESHOLDS[index]) {
      level = index + 1;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

export function maxLevelXp(): number {
  return LEVEL_XP_THRESHOLDS[MAX_LEVEL - 1] ?? 0;
}

export function capXp(xp: number): number {
  return Math.min(xp, maxLevelXp());
}

export function isMaxLevel(level: number): boolean {
  return level >= MAX_LEVEL;
}

export function canPrestige(level: number, prestigeCount: number): boolean {
  return isMaxLevel(level) && prestigeCount < MAX_PRESTIGE;
}

export function prestigeLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "Prestige I";
  if (count === 2) return "Prestige II";
  if (count === 3) return "Prestige III";
  if (count === 4) return "Prestige IV";
  if (count === 5) return "Prestige V";
  if (count === 6) return "Prestige VI";
  if (count === 7) return "Prestige VII";
  if (count === 8) return "Prestige VIII";
  if (count === 9) return "Prestige IX";
  return "Prestige X";
}

export function getLevelProgress(xp: number): {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
} {
  const level = xpToLevel(xp);
  const xpForCurrentLevel = LEVEL_XP_THRESHOLDS[level - 1] ?? 0;
  const atMaxLevel = level >= MAX_LEVEL;
  const xpForNextLevel = atMaxLevel
    ? xpForCurrentLevel
    : (LEVEL_XP_THRESHOLDS[level] ?? xpForCurrentLevel + 200);

  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpNeededForLevel = atMaxLevel ? 1 : Math.max(1, xpForNextLevel - xpForCurrentLevel);
  const progressPercent = atMaxLevel
    ? 100
    : Math.min(100, Math.round((xpIntoLevel / xpNeededForLevel) * 100));

  return {
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    xpIntoLevel,
    xpNeededForLevel,
    progressPercent,
  };
}

export function skillRatingToTier(rating: number | null, scoredSessionCount: number): SkillTier {
  if (scoredSessionCount < MIN_SCORED_SESSIONS_FOR_SKILL || rating === null) {
    return "calibrating";
  }
  if (rating >= 80) return "platinum";
  if (rating >= 60) return "gold";
  if (rating >= 40) return "silver";
  return "bronze";
}

export function skillTierColor(tier: SkillTier): string {
  switch (tier) {
    case "platinum":
      return "text-cyan-300";
    case "gold":
      return "text-amber-300";
    case "silver":
      return "text-slate-200";
    case "bronze":
      return "text-orange-400";
    default:
      return "text-slate-400";
  }
}

export function skillTierBadgeClass(tier: SkillTier): string {
  switch (tier) {
    case "platinum":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
    case "gold":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "silver":
      return "border-slate-400/30 bg-slate-400/10 text-slate-200";
    case "bronze":
      return "border-orange-500/30 bg-orange-500/10 text-orange-200";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-400";
  }
}

const TIER_RANK: Record<SkillTier, number> = {
  calibrating: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

export function tierRank(tier: SkillTier): number {
  return TIER_RANK[tier];
}

export function isTierPromotion(previous: SkillTier, next: SkillTier): boolean {
  return tierRank(next) > tierRank(previous);
}

export function formatXpBreakdown(breakdown: { total: number }): string {
  return `+${breakdown.total} XP`;
}
