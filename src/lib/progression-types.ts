export type SkillTier = "calibrating" | "bronze" | "silver" | "gold" | "platinum";

export type CosmeticId =
  | "border-starter"
  | "border-copper"
  | "border-emerald"
  | "border-sky"
  | "border-violet"
  | "border-flame"
  | "border-gold"
  | "border-aurora"
  | "border-platinum"
  | "border-legend"
  | "border-diamond"
  | "border-executive"
  | "border-inner-circle"
  | "border-hall-of-fame"
  | "badge-none"
  | "badge-rookie"
  | "badge-grinder"
  | "badge-veteran"
  | "badge-champion"
  | "badge-legend"
  | "badge-executive"
  | "badge-presidents-club"
  | "badge-inner-circle"
  | "badge-icon"
  | "badge-top-producer"
  | "badge-handler"
  | "badge-closer"
  | "badge-elite"
  | "badge-streak"
  | "badge-voice-pro"
  | "theme-default"
  | "theme-dusk"
  | "theme-ocean"
  | "theme-sunset"
  | "theme-royal"
  | "theme-neon"
  | "theme-obsidian"
  | "theme-emerald"
  | "theme-executive-suite"
  | "theme-black-tie"
  | "theme-platinum-lounge"
  | "theme-penthouse"
  | "theme-corner-office"
  | "badge-prestige-1"
  | "badge-prestige-2"
  | "badge-prestige-3"
  | "badge-prestige-4"
  | "badge-prestige-5"
  | "badge-prestige-6"
  | "badge-prestige-7"
  | "badge-prestige-8"
  | "badge-prestige-9"
  | "badge-prestige-10"
  | "border-prestige-1"
  | "border-prestige-2"
  | "border-prestige-3"
  | "border-prestige-4"
  | "border-prestige-5"
  | "border-prestige-6"
  | "border-prestige-7"
  | "border-prestige-8"
  | "border-prestige-9"
  | "border-prestige-10";

export interface EquippedCosmetics {
  avatarBorder?: CosmeticId;
  badge?: CosmeticId;
  theme?: CosmeticId;
}

export type AvatarPresetId =
  | "preset-blue"
  | "preset-violet"
  | "preset-emerald"
  | "preset-amber"
  | "preset-rose"
  | "preset-cyan"
  | "preset-orange"
  | "preset-indigo";

export interface ProfilePicture {
  type: "initial" | "preset" | "upload";
  presetId?: AvatarPresetId;
  uploadedAt?: string;
}

export interface SessionXpBreakdown {
  base: number;
  voiceBonus: number;
  dailyBonus: number;
  qualityBonus: number;
  improvementBonus: number;
  total: number;
}

export interface AgentProgression {
  userId: string;
  xp: number;
  level: number;
  prestigeCount: number;
  skillRating: number | null;
  skillTier: SkillTier;
  streakDays: number;
  lastPracticeDate: string | null;
  lastXpSessionId: string | null;
  lastSessionXp: SessionXpBreakdown | null;
  unlockedCosmetics: CosmeticId[];
  equippedCosmetics: EquippedCosmetics;
  profilePicture: ProfilePicture;
  updatedAt: string;
}

export interface LevelProgress {
  level: number;
  xp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
}

import type { CosmeticItemState } from "./cosmetics";

export interface ProgressionSummary {
  xp: number;
  level: number;
  prestigeCount: number;
  maxLevel: number;
  maxPrestige: number;
  canPrestige: boolean;
  prestigeLabel: string;
  levelProgress: LevelProgress;
  skillRating: number | null;
  skillTier: SkillTier;
  skillTierLabel: string;
  streakDays: number;
  lastSessionXp: SessionXpBreakdown | null;
  scoredSessionCount: number;
  minSessionsForSkill: number;
  unlockedCosmetics: CosmeticId[];
  equippedCosmetics: EquippedCosmetics;
  profilePicture: ProfilePicture;
  cosmetics: CosmeticItemState[];
}

export interface ProgressionMilestone {
  type: "level" | "rank" | "prestige";
  previousLevel?: number;
  newLevel?: number;
  previousTier?: SkillTier;
  newTier?: SkillTier;
  skillRating?: number | null;
  prestigeCount?: number;
  unlockedCosmetics?: CosmeticId[];
}

export interface SessionXpAwardResult {
  xp: SessionXpBreakdown;
  milestones: ProgressionMilestone[];
  level: number;
  skillTier: SkillTier;
  skillTierLabel: string;
}

export interface PrestigeResult {
  prestigeCount: number;
  maxPrestige: number;
  prestigeLabel: string;
  unlockedCosmetics: CosmeticId[];
  milestones: ProgressionMilestone[];
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  role: "admin" | "agent";
  level: number;
  prestigeCount: number;
  xp: number;
  skillTier: SkillTier;
  skillTierLabel: string;
  skillRating: number | null;
  streakDays: number;
  rank: number;
  isCurrentUser: boolean;
}

export type LeaderboardSort = "level" | "skill";

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  sort: LeaderboardSort;
  currentUserId: string;
}
