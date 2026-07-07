import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ensureDataDir } from "./profile";
import type {
  ChatMessage,
  ObjectionTrackerItem,
  PracticeDebrief,
  PracticeSession,
  PracticeSessionSummary,
} from "./types";

const SESSIONS_DIR = path.join(process.cwd(), "data", "practice-sessions");

function sessionPath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

export async function savePracticeSession(
  input: Omit<PracticeSession, "id" | "createdAt">
): Promise<PracticeSession> {
  await ensureDataDir();
  await fs.mkdir(SESSIONS_DIR, { recursive: true });

  const session: PracticeSession = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), "utf-8");
  return session;
}

export async function getPracticeSession(id: string): Promise<PracticeSession | null> {
  try {
    const raw = await fs.readFile(sessionPath(id), "utf-8");
    return JSON.parse(raw) as PracticeSession;
  } catch {
    return null;
  }
}

export async function listAllSessions(): Promise<PracticeSession[]> {
  await ensureDataDir();
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    const sessions: PracticeSession[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(SESSIONS_DIR, file), "utf-8");
        sessions.push(JSON.parse(raw) as PracticeSession);
      } catch {
        // skip corrupt files
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function listSessionsForUser(userId: string): Promise<PracticeSession[]> {
  const all = await listAllSessions();
  return all.filter((session) => session.userId === userId);
}

export function toSessionSummary(session: PracticeSession): PracticeSessionSummary {
  const userTurns = session.messages.filter((message) => message.role === "user").length;
  const weakObjections = session.objectionScores.filter(
    (item) => item.score !== undefined && item.score < 7
  ).length;

  return {
    id: session.id,
    userId: session.userId,
    userName: session.userName,
    createdAt: session.createdAt,
    mode: session.mode,
    voiceMode: session.voiceMode,
    objectionDrill: session.objectionDrill,
    messageCount: session.messages.length,
    userTurns,
    overallScore: session.debrief?.overallScore,
    objectionCount: session.objectionScores.length,
    weakObjections,
  };
}

export interface TeamMetrics {
  totalSessions: number;
  totalAgents: number;
  activeAgentsLast7Days: number;
  averageScore: number | null;
  sessionsLast7Days: number;
  scoreTrend: Array<{ date: string; averageScore: number; sessionCount: number }>;
  topWeakObjections: Array<{ text: string; count: number; averageScore: number }>;
  agentSummaries: Array<{
    userId: string;
    userName: string;
    email: string;
    sessionCount: number;
    averageScore: number | null;
    lastSessionAt: string | null;
    weakObjectionRate: number;
  }>;
}

export async function computeTeamMetrics(users: Array<{ id: string; name: string; email: string }>): Promise<TeamMetrics> {
  const sessions = await listAllSessions();
  const agentUsers = users;
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const sessionsLast7 = sessions.filter(
    (session) => new Date(session.createdAt).getTime() >= sevenDaysAgo
  );

  const activeAgentIds = new Set(sessionsLast7.map((session) => session.userId));

  const scoredSessions = sessions.filter((session) => session.debrief?.overallScore !== undefined);
  const averageScore =
    scoredSessions.length > 0
      ? Math.round(
          (scoredSessions.reduce((sum, session) => sum + (session.debrief?.overallScore ?? 0), 0) /
            scoredSessions.length) *
            10
        ) / 10
      : null;

  const trendMap = new Map<string, { total: number; count: number }>();
  for (const session of scoredSessions) {
    const date = session.createdAt.slice(0, 10);
    const entry = trendMap.get(date) ?? { total: 0, count: 0 };
    entry.total += session.debrief?.overallScore ?? 0;
    entry.count += 1;
    trendMap.set(date, entry);
  }

  const scoreTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, entry]) => ({
      date,
      averageScore: Math.round((entry.total / entry.count) * 10) / 10,
      sessionCount: entry.count,
    }));

  const objectionMap = new Map<string, { count: number; totalScore: number }>();
  for (const session of sessions) {
    for (const item of session.objectionScores) {
      if (item.score === undefined) continue;
      const key = item.text.toLowerCase();
      const entry = objectionMap.get(key) ?? { count: 0, totalScore: 0 };
      entry.count += 1;
      entry.totalScore += item.score;
      objectionMap.set(key, entry);
    }
  }

  const topWeakObjections = Array.from(objectionMap.entries())
    .map(([text, entry]) => ({
      text,
      count: entry.count,
      averageScore: Math.round((entry.totalScore / entry.count) * 10) / 10,
    }))
    .filter((item) => item.averageScore < 7)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 8);

  const agentSummaries = agentUsers.map((user) => {
    const userSessions = sessions.filter((session) => session.userId === user.id);
    const userScored = userSessions.filter((session) => session.debrief?.overallScore !== undefined);
    const userAvg =
      userScored.length > 0
        ? Math.round(
            (userScored.reduce((sum, session) => sum + (session.debrief?.overallScore ?? 0), 0) /
              userScored.length) *
              10
          ) / 10
        : null;

    let weakCount = 0;
    let objectionTotal = 0;
    for (const session of userSessions) {
      for (const item of session.objectionScores) {
        if (item.score === undefined) continue;
        objectionTotal += 1;
        if (item.score < 7) weakCount += 1;
      }
    }

    return {
      userId: user.id,
      userName: user.name,
      email: user.email,
      sessionCount: userSessions.length,
      averageScore: userAvg,
      lastSessionAt: userSessions[0]?.createdAt ?? null,
      weakObjectionRate:
        objectionTotal > 0 ? Math.round((weakCount / objectionTotal) * 100) : 0,
    };
  });

  return {
    totalSessions: sessions.length,
    totalAgents: agentUsers.length,
    activeAgentsLast7Days: activeAgentIds.size,
    averageScore,
    sessionsLast7Days: sessionsLast7.length,
    scoreTrend,
    topWeakObjections,
    agentSummaries: agentSummaries.sort((a, b) => b.sessionCount - a.sessionCount),
  };
}

export type SaveSessionInput = {
  userId: string;
  userName: string;
  mode: PracticeSession["mode"];
  voiceMode: boolean;
  objectionDrill: boolean;
  messages: ChatMessage[];
  debrief?: PracticeDebrief | null;
  objectionScores: ObjectionTrackerItem[];
};
