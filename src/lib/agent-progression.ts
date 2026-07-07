import fs from "fs/promises";
import path from "path";
import { ensureDataDir } from "./profile";
import type { PracticeSession } from "./types";
import { listSessionsForUser } from "./practice-sessions";
import {
  buildCosmeticItemStates,
  buildUnlockContext,
  DEFAULT_EQUIPPED,
  getPrestigeUnlockIds,
  isEquippedIdAllowed,
  reconcileUnlockedCosmetics,
  sanitizeEquipped,
} from "./cosmetics";
import { DEFAULT_PROFILE_PICTURE, normalizeProfilePicture } from "./avatar";
import type {
  AgentProgression,
  CosmeticId,
  EquippedCosmetics,
  ProfilePicture,
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardSort,
  LevelProgress,
  ProgressionMilestone,
  ProgressionSummary,
  SessionXpAwardResult,
  SessionXpBreakdown,
  SkillTier,
  PrestigeResult,
} from "./progression-types";
import {
  canPrestige,
  capXp,
  getLevelProgress,
  isTierPromotion,
  MAX_LEVEL,
  MAX_PRESTIGE,
  MIN_SCORED_SESSIONS_FOR_SKILL,
  prestigeLabel,
  SKILL_TIER_LABELS,
  skillRatingToTier,
  tierRank,
  xpToLevel,
} from "./progression-utils";
import { listUsers } from "./users";

const PROGRESSION_DIR = path.join(process.cwd(), "data", "agent-progression");

function progressionPath(userId: string): string {
  return path.join(PROGRESSION_DIR, `${userId}.json`);
}

function defaultProgression(userId: string): AgentProgression {
  return {
    userId,
    xp: 0,
    level: 1,
    prestigeCount: 0,
    skillRating: null,
    skillTier: "calibrating",
    streakDays: 0,
    lastPracticeDate: null,
    lastXpSessionId: null,
    lastSessionXp: null,
    unlockedCosmetics: ["border-starter", "badge-none", "theme-default"],
    equippedCosmetics: { ...DEFAULT_EQUIPPED },
    profilePicture: { ...DEFAULT_PROFILE_PICTURE },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProgression(raw: Partial<AgentProgression> & { userId: string }): AgentProgression {
  const base = defaultProgression(raw.userId);
  return {
    ...base,
    ...raw,
    prestigeCount: raw.prestigeCount ?? 0,
    unlockedCosmetics: raw.unlockedCosmetics ?? base.unlockedCosmetics,
    equippedCosmetics: {
      ...base.equippedCosmetics,
      ...raw.equippedCosmetics,
    },
    profilePicture: normalizeProfilePicture(raw.profilePicture ?? base.profilePicture),
  };
}

async function syncCosmetics(progression: AgentProgression): Promise<AgentProgression> {
  const sessions = await listSessionsForUser(progression.userId);
  const level = xpToLevel(progression.xp);
  const scored = getScoredSessions(sessions);
  let skillTier = progression.skillTier;
  let skillRating = progression.skillRating;

  if (scored.length >= MIN_SCORED_SESSIONS_FOR_SKILL) {
    skillRating = computeSkillRating(sessions);
    skillTier = skillRatingToTier(skillRating, scored.length);
  }

  const unlockContext = buildUnlockContext(
    level,
    skillTier,
    progression.streakDays,
    sessions,
    progression.prestigeCount
  );
  const unlocked = reconcileUnlockedCosmetics(progression.unlockedCosmetics, unlockContext);

  const needsEquippedFix =
    !isEquippedIdAllowed(progression.equippedCosmetics.avatarBorder, unlocked) ||
    !isEquippedIdAllowed(progression.equippedCosmetics.badge, unlocked) ||
    !isEquippedIdAllowed(progression.equippedCosmetics.theme, unlocked);

  const equippedCosmetics = needsEquippedFix
    ? sanitizeEquipped(unlocked, progression.equippedCosmetics)
    : progression.equippedCosmetics;

  const savedSet = new Set(progression.unlockedCosmetics);
  const unlockedChanged =
    unlocked.length !== progression.unlockedCosmetics.length ||
    unlocked.some((id) => !savedSet.has(id)) ||
    progression.unlockedCosmetics.some((id) => !unlocked.includes(id));

  if (!unlockedChanged && !needsEquippedFix) {
    return progression;
  }

  const updated: AgentProgression = {
    ...progression,
    level,
    skillRating,
    skillTier,
    unlockedCosmetics: unlocked,
    equippedCosmetics,
    updatedAt: new Date().toISOString(),
  };

  await saveAgentProgression(updated);
  return updated;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function getAgentProgression(userId: string): Promise<AgentProgression> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(progressionPath(userId), "utf-8");
    const progression = normalizeProgression(JSON.parse(raw) as Partial<AgentProgression> & { userId: string });
    return syncCosmetics(progression);
  } catch {
    return defaultProgression(userId);
  }
}

async function saveAgentProgression(progression: AgentProgression): Promise<void> {
  await ensureDataDir();
  await fs.mkdir(PROGRESSION_DIR, { recursive: true });
  await fs.writeFile(
    progressionPath(progression.userId),
    JSON.stringify(progression, null, 2),
    "utf-8"
  );
}

function getScoredSessions(sessions: PracticeSession[]): PracticeSession[] {
  return sessions
    .filter((session) => session.debrief?.overallScore !== undefined)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function computeSkillRating(sessions: PracticeSession[]): number | null {
  const scored = getScoredSessions(sessions);
  if (scored.length < MIN_SCORED_SESSIONS_FOR_SKILL) {
    return null;
  }

  const recent = scored.slice(0, 10);

  const overallAvg =
    recent.reduce((sum, session) => sum + (session.debrief?.overallScore ?? 0), 0) / recent.length;

  const objectionAvg =
    recent.reduce((sum, session) => sum + (session.debrief?.objectionHandling.score ?? 0), 0) /
    recent.length;

  let objectionHits = 0;
  let objectionTotal = 0;
  for (const session of recent) {
    for (const item of session.objectionScores) {
      if (item.score === undefined) continue;
      objectionTotal += 1;
      if (item.score >= 7) objectionHits += 1;
    }
  }
  const objectionRate = objectionTotal > 0 ? (objectionHits / objectionTotal) * 10 : overallAvg;

  let improvementScore = 5;
  if (scored.length >= 6) {
    const last5 = scored.slice(0, 5);
    const prior5 = scored.slice(5, 10);
    const last5Avg =
      last5.reduce((sum, session) => sum + (session.debrief?.overallScore ?? 0), 0) / last5.length;
    const prior5Avg =
      prior5.reduce((sum, session) => sum + (session.debrief?.overallScore ?? 0), 0) / prior5.length;
    const delta = last5Avg - prior5Avg;
    improvementScore = Math.min(10, Math.max(0, 5 + delta));
  }

  const composite =
    overallAvg * 0.4 + objectionAvg * 0.25 + objectionRate * 0.2 + improvementScore * 0.15;

  return Math.round(Math.min(100, Math.max(0, composite * 10)));
}

function calculateQualityBonus(score: number | undefined): number {
  if (score === undefined) return 0;
  if (score >= 8) return 25;
  if (score >= 7) return 15;
  if (score >= 6) return 10;
  return 0;
}

function calculateImprovementBonus(
  currentScore: number,
  priorSessions: PracticeSession[]
): number {
  const priorScored = getScoredSessions(priorSessions).slice(0, 5);
  if (priorScored.length < 2) return 0;

  const priorAvg =
    priorScored.reduce((sum, session) => sum + (session.debrief?.overallScore ?? 0), 0) /
    priorScored.length;

  return currentScore >= priorAvg + 0.5 ? 20 : 0;
}

function updateStreak(progression: AgentProgression, practiceDate: string): number {
  if (progression.lastPracticeDate === practiceDate) {
    return progression.streakDays;
  }
  if (progression.lastPracticeDate === yesterdayDateString()) {
    return Math.max(1, progression.streakDays + 1);
  }
  return 1;
}

export function calculateSessionXp(
  session: PracticeSession,
  priorSessions: PracticeSession[],
  progression: AgentProgression
): SessionXpBreakdown {
  const breakdown: SessionXpBreakdown = {
    base: 0,
    voiceBonus: 0,
    dailyBonus: 0,
    qualityBonus: 0,
    improvementBonus: 0,
    total: 0,
  };

  if (!session.debrief) {
    return breakdown;
  }

  breakdown.base = 50;

  if (session.voiceMode) {
    breakdown.voiceBonus = 10;
  }

  const today = todayDateString();
  if (progression.lastPracticeDate !== today) {
    breakdown.dailyBonus = 15;
  }

  breakdown.qualityBonus = calculateQualityBonus(session.debrief.overallScore);

  const priorWithoutCurrent = priorSessions.filter((item) => item.id !== session.id);
  breakdown.improvementBonus = calculateImprovementBonus(
    session.debrief.overallScore,
    priorWithoutCurrent
  );

  breakdown.total =
    breakdown.base +
    breakdown.voiceBonus +
    breakdown.dailyBonus +
    breakdown.qualityBonus +
    breakdown.improvementBonus;

  return breakdown;
}

export async function awardSessionXp(
  userId: string,
  session: PracticeSession
): Promise<SessionXpAwardResult | null> {
  const progression = await getAgentProgression(userId);

  if (progression.lastXpSessionId === session.id) {
    if (!progression.lastSessionXp) return null;
    return {
      xp: progression.lastSessionXp,
      milestones: [],
      level: progression.level,
      skillTier: progression.skillTier,
      skillTierLabel: SKILL_TIER_LABELS[progression.skillTier],
    };
  }

  if (!session.debrief) {
    return null;
  }

  const allSessions = await listSessionsForUser(userId);
  const xpBreakdown = calculateSessionXp(session, allSessions, progression);
  if (xpBreakdown.total <= 0) {
    return null;
  }

  const previousLevel = progression.level;
  const previousTier = progression.skillTier;
  const practiceDate = session.createdAt.slice(0, 10);
  const streakDays = updateStreak(progression, practiceDate);
  const newXp = capXp(progression.xp + xpBreakdown.total);
  const scored = getScoredSessions(allSessions);
  const skillRating = computeSkillRating(allSessions);
  const skillTier = skillRatingToTier(skillRating, scored.length);
  const newLevel = xpToLevel(newXp);

  const milestones: ProgressionMilestone[] = [];

  if (newLevel > previousLevel) {
    milestones.push({
      type: "level",
      previousLevel,
      newLevel,
    });
  }

  if (isTierPromotion(previousTier, skillTier)) {
    milestones.push({
      type: "rank",
      previousTier,
      newTier: skillTier,
      skillRating,
    });
  }

  const updated: AgentProgression = {
    ...progression,
    xp: newXp,
    level: newLevel,
    skillRating,
    skillTier,
    streakDays,
    lastPracticeDate: practiceDate,
    lastXpSessionId: session.id,
    lastSessionXp: xpBreakdown,
    updatedAt: new Date().toISOString(),
  };

  await saveAgentProgression(updated);
  await syncCosmetics(updated);

  return {
    xp: xpBreakdown,
    milestones,
    level: newLevel,
    skillTier,
    skillTierLabel: SKILL_TIER_LABELS[skillTier],
  };
}

export async function equipCosmetics(
  userId: string,
  equipped: EquippedCosmetics
): Promise<AgentProgression> {
  return updateAgentProfile(userId, { equipped });
}

export async function updateAgentProfile(
  userId: string,
  input: { equipped?: EquippedCosmetics; profilePicture?: ProfilePicture }
): Promise<AgentProgression> {
  const progression = await getAgentProgression(userId);

  const equipped = input.equipped
    ? sanitizeEquipped(progression.unlockedCosmetics, {
        ...progression.equippedCosmetics,
        ...input.equipped,
      })
    : progression.equippedCosmetics;

  const profilePicture = input.profilePicture
    ? normalizeProfilePicture(input.profilePicture)
    : progression.profilePicture;

  const updated: AgentProgression = {
    ...progression,
    equippedCosmetics: equipped,
    profilePicture,
    updatedAt: new Date().toISOString(),
  };

  await saveAgentProgression(updated);
  return updated;
}

export async function recomputeSkillRating(userId: string): Promise<AgentProgression> {
  const [progression, sessions] = await Promise.all([
    getAgentProgression(userId),
    listSessionsForUser(userId),
  ]);

  const scored = getScoredSessions(sessions);
  const skillRating = computeSkillRating(sessions);
  const skillTier = skillRatingToTier(skillRating, scored.length);

  const updated: AgentProgression = {
    ...progression,
    skillRating,
    skillTier,
    level: xpToLevel(progression.xp),
    updatedAt: new Date().toISOString(),
  };

  await saveAgentProgression(updated);
  return updated;
}

export async function getProgressionSummary(userId: string): Promise<ProgressionSummary> {
  const [progression, sessions] = await Promise.all([
    getAgentProgression(userId),
    listSessionsForUser(userId),
  ]);

  const scored = getScoredSessions(sessions);
  let skillRating = progression.skillRating;
  let skillTier: SkillTier = progression.skillTier;

  if (skillRating === null && scored.length >= MIN_SCORED_SESSIONS_FOR_SKILL) {
    skillRating = computeSkillRating(sessions);
    skillTier = skillRatingToTier(skillRating, scored.length);
  } else if (scored.length < MIN_SCORED_SESSIONS_FOR_SKILL) {
    skillRating = null;
    skillTier = "calibrating";
  }

  const levelInfo = getLevelProgress(progression.xp);
  const levelProgress: LevelProgress = {
    xp: progression.xp,
    ...levelInfo,
  };

  const cosmetics = buildCosmeticItemStates(
    progression.unlockedCosmetics,
    progression.equippedCosmetics,
    levelInfo.level,
    progression.prestigeCount
  );

  return {
    xp: progression.xp,
    level: levelInfo.level,
    prestigeCount: progression.prestigeCount,
    maxLevel: MAX_LEVEL,
    maxPrestige: MAX_PRESTIGE,
    canPrestige: canPrestige(levelInfo.level, progression.prestigeCount),
    prestigeLabel: prestigeLabel(progression.prestigeCount),
    levelProgress,
    skillRating,
    skillTier,
    skillTierLabel: SKILL_TIER_LABELS[skillTier],
    streakDays: progression.streakDays,
    lastSessionXp: progression.lastSessionXp,
    scoredSessionCount: scored.length,
    minSessionsForSkill: MIN_SCORED_SESSIONS_FOR_SKILL,
    unlockedCosmetics: progression.unlockedCosmetics,
    equippedCosmetics: progression.equippedCosmetics,
    profilePicture: progression.profilePicture,
    cosmetics,
  };
}

function compareByLevel(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.prestigeCount !== a.prestigeCount) return b.prestigeCount - a.prestigeCount;
  if (b.level !== a.level) return b.level - a.level;
  if (b.xp !== a.xp) return b.xp - a.xp;
  return b.skillRating ?? -1 - (a.skillRating ?? -1);
}

function compareBySkill(a: LeaderboardEntry, b: LeaderboardEntry): number {
  const tierDiff = tierRank(b.skillTier) - tierRank(a.skillTier);
  if (tierDiff !== 0) return tierDiff;
  const ratingDiff = (b.skillRating ?? -1) - (a.skillRating ?? -1);
  if (ratingDiff !== 0) return ratingDiff;
  if (b.prestigeCount !== a.prestigeCount) return b.prestigeCount - a.prestigeCount;
  if (b.level !== a.level) return b.level - a.level;
  return b.xp - a.xp;
}

function assignRanks(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export async function getLeaderboard(
  currentUserId: string,
  sort: LeaderboardSort = "level"
): Promise<LeaderboardResponse> {
  const users = await listUsers();
  const entries: LeaderboardEntry[] = await Promise.all(
    users.map(async (user) => {
      const progression = await getAgentProgression(user.id);
      return {
        userId: user.id,
        name: user.name,
        role: user.role,
        level: progression.level,
        prestigeCount: progression.prestigeCount,
        xp: progression.xp,
        skillTier: progression.skillTier,
        skillTierLabel: SKILL_TIER_LABELS[progression.skillTier],
        skillRating: progression.skillRating,
        streakDays: progression.streakDays,
        rank: 0,
        isCurrentUser: user.id === currentUserId,
      };
    })
  );

  const sorted =
    sort === "skill"
      ? [...entries].sort(compareBySkill)
      : [...entries].sort(compareByLevel);

  return {
    entries: assignRanks(sorted),
    sort,
    currentUserId,
  };
}

export async function prestigeAgent(userId: string): Promise<PrestigeResult> {
  const progression = await getAgentProgression(userId);
  const level = xpToLevel(progression.xp);

  if (!canPrestige(level, progression.prestigeCount)) {
    if (progression.prestigeCount >= MAX_PRESTIGE) {
      throw new Error("You have reached maximum prestige.");
    }
    throw new Error(`Reach level ${MAX_LEVEL} before you can prestige.`);
  }

  const newPrestigeCount = progression.prestigeCount + 1;
  const newUnlocks = getPrestigeUnlockIds(newPrestigeCount);

  const updated: AgentProgression = {
    ...progression,
    xp: 0,
    level: 1,
    prestigeCount: newPrestigeCount,
    unlockedCosmetics: Array.from(new Set([...progression.unlockedCosmetics, ...newUnlocks])),
    updatedAt: new Date().toISOString(),
  };

  await saveAgentProgression(updated);
  await syncCosmetics(updated);

  return {
    prestigeCount: newPrestigeCount,
    maxPrestige: MAX_PRESTIGE,
    prestigeLabel: prestigeLabel(newPrestigeCount),
    unlockedCosmetics: newUnlocks,
    milestones: [
      {
        type: "prestige",
        prestigeCount: newPrestigeCount,
        previousLevel: MAX_LEVEL,
        newLevel: 1,
        unlockedCosmetics: newUnlocks,
      },
    ],
  };
}
