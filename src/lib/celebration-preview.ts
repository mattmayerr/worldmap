import type { SessionXpAwardResult } from "./progression-types";
import { SKILL_TIER_LABELS } from "./progression-utils";

export type CelebrationPreviewMode = "level" | "rank" | "both";

export function buildCelebrationPreview(mode: CelebrationPreviewMode): SessionXpAwardResult {
  const xp = {
    base: 50,
    voiceBonus: 10,
    dailyBonus: 15,
    qualityBonus: 25,
    improvementBonus: 0,
    total: 100,
  };

  if (mode === "level") {
    return {
      xp,
      level: 4,
      skillTier: "calibrating",
      skillTierLabel: SKILL_TIER_LABELS.calibrating,
      milestones: [{ type: "level", previousLevel: 3, newLevel: 4 }],
    };
  }

  if (mode === "rank") {
    return {
      xp,
      level: 3,
      skillTier: "silver",
      skillTierLabel: SKILL_TIER_LABELS.silver,
      milestones: [
        {
          type: "rank",
          previousTier: "bronze",
          newTier: "silver",
          skillRating: 52,
        },
      ],
    };
  }

  return {
    xp,
    level: 5,
    skillTier: "gold",
    skillTierLabel: SKILL_TIER_LABELS.gold,
    milestones: [
      { type: "level", previousLevel: 4, newLevel: 5 },
      {
        type: "rank",
        previousTier: "silver",
        newTier: "gold",
        skillRating: 68,
      },
    ],
  };
}

export function parseCelebrationPreview(
  value: string | null
): CelebrationPreviewMode | null {
  if (value === "level" || value === "rank" || value === "both") {
    return value;
  }
  return null;
}
