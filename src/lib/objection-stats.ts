import { listAllExamples } from "./objection-examples";
import {
  B2C_OBJECTION_LIBRARY,
  OBJECTION_CATEGORY_LABELS,
  OBJECTION_CATEGORY_ORDER,
  buildObjectionPool,
  getLibraryObjectionByKey,
  resolveObjectionMeta,
  type ObjectionCategory,
} from "./objection-library";
import { normalizeObjectionKey } from "./objection-utils";
import { listAllSessions, listSessionsForUser } from "./practice-sessions";
import type { ObjectionTrackerItem, PracticeSession } from "./types";

export interface ObjectionPerformance {
  objectionKey: string;
  objectionText: string;
  category: ObjectionCategory;
  libraryId?: string;
  source?: "library" | "profile" | "personal";
  attempts: number;
  averageScore: number | null;
  bestScore: number | null;
  lastScore: number | null;
  lastPracticedAt: string | null;
  latestFeedback?: string;
  examplesSubmitted: number;
}

function scoreHistoryFromSessions(
  sessions: PracticeSession[],
  objectionKey: string
): Array<{ score: number; date: string }> {
  const history: Array<{ score: number; date: string }> = [];

  for (const session of sessions) {
    for (const item of session.objectionScores) {
      if (item.score === undefined) continue;
      if (normalizeObjectionKey(item.text) !== objectionKey) continue;
      history.push({ score: item.score, date: session.createdAt });
    }
  }

  return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function computeObjectionPerformance(
  sessions: PracticeSession[],
  examples: Awaited<ReturnType<typeof listAllExamples>>,
  userId?: string
): ObjectionPerformance[] {
  const map = new Map<string, ObjectionPerformance>();

  function ensure(text: string, source?: ObjectionPerformance["source"]) {
    const key = normalizeObjectionKey(text);
    if (map.has(key)) return map.get(key)!;

    const meta = resolveObjectionMeta(text, source ?? "library");
    const entry: ObjectionPerformance = {
      objectionKey: key,
      objectionText: meta.text,
      category: meta.category,
      libraryId: meta.source === "library" ? meta.id : undefined,
      source: meta.source,
      attempts: 0,
      averageScore: null,
      bestScore: null,
      lastScore: null,
      lastPracticedAt: null,
      examplesSubmitted: 0,
    };
    map.set(key, entry);
    return entry;
  }

  for (const item of B2C_OBJECTION_LIBRARY) {
    ensure(item.text, "library");
  }

  for (const session of sessions) {
    for (const item of session.objectionScores) {
      const entry = ensure(item.text, item.source);
      if (item.score !== undefined) {
        entry.attempts += 1;
        entry.bestScore =
          entry.bestScore === null ? item.score : Math.max(entry.bestScore, item.score);
        entry.lastScore = item.score;
        entry.lastPracticedAt = session.createdAt;
        if (item.feedback) entry.latestFeedback = item.feedback;
      }
    }
  }

  if (userId) {
    for (const example of examples.filter((item) => item.userId === userId)) {
      const entry = ensure(example.objectionText, "personal");
      entry.examplesSubmitted += 1;
    }
  }

  for (const [key, entry] of Array.from(map.entries())) {
    const history = scoreHistoryFromSessions(sessions, key);
    if (history.length > 0) {
      entry.averageScore =
        Math.round((history.reduce((sum, item) => sum + item.score, 0) / history.length) * 10) / 10;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.attempts !== b.attempts) return b.attempts - a.attempts;
    return a.objectionText.localeCompare(b.objectionText);
  });
}

export function computeCategorySummary(
  performance: ObjectionPerformance[]
): Array<{
  category: ObjectionCategory;
  label: string;
  practiced: number;
  averageScore: number | null;
  weakCount: number;
}> {
  return OBJECTION_CATEGORY_ORDER.map((category) => {
    const items = performance.filter((item) => item.category === category && item.attempts > 0);
    const scores = items
      .map((item) => item.averageScore)
      .filter((score): score is number => score !== null);

    return {
      category,
      label: OBJECTION_CATEGORY_LABELS[category],
      practiced: items.length,
      averageScore:
        scores.length > 0
          ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
          : null,
      weakCount: items.filter((item) => (item.bestScore ?? 0) < 7).length,
    };
  }).filter((item) => item.practiced > 0 || B2C_OBJECTION_LIBRARY.some((o) => o.category === item.category));
}

export interface AdminAgentObjectionRow {
  userId: string;
  userName: string;
  email: string;
  objectionKey: string;
  objectionText: string;
  category: ObjectionCategory;
  attempts: number;
  averageScore: number | null;
  bestScore: number | null;
  lastPracticedAt: string | null;
  examplesSubmitted: number;
}

export async function computeAdminObjectionStats(
  agents: Array<{ id: string; name: string; email: string }>
): Promise<{
  librarySize: number;
  byCategory: Array<{
    category: ObjectionCategory;
    label: string;
    totalAttempts: number;
    teamAverageScore: number | null;
  }>;
  agentRows: AdminAgentObjectionRow[];
  topWeakForTeam: Array<{ text: string; category: ObjectionCategory; averageScore: number; attempts: number }>;
}> {
  const [sessions, examples] = await Promise.all([listAllSessions(), listAllExamples()]);

  const agentRows: AdminAgentObjectionRow[] = [];

  for (const agent of agents) {
    const userSessions = sessions.filter((session) => session.userId === agent.id);
    const performance = computeObjectionPerformance(userSessions, examples, agent.id);

    for (const item of performance.filter((entry) => entry.attempts > 0)) {
      agentRows.push({
        userId: agent.id,
        userName: agent.name,
        email: agent.email,
        objectionKey: item.objectionKey,
        objectionText: item.objectionText,
        category: item.category,
        attempts: item.attempts,
        averageScore: item.averageScore,
        bestScore: item.bestScore,
        lastPracticedAt: item.lastPracticedAt,
        examplesSubmitted: item.examplesSubmitted,
      });
    }
  }

  const categoryTotals = OBJECTION_CATEGORY_ORDER.map((category) => {
    const rows = agentRows.filter((row) => row.category === category);
    const scores = rows
      .map((row) => row.averageScore)
      .filter((score): score is number => score !== null);

    return {
      category,
      label: OBJECTION_CATEGORY_LABELS[category],
      totalAttempts: rows.reduce((sum, row) => sum + row.attempts, 0),
      teamAverageScore:
        scores.length > 0
          ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
          : null,
    };
  });

  const teamObjectionMap = new Map<
    string,
    { text: string; category: ObjectionCategory; total: number; count: number }
  >();

  for (const row of agentRows) {
    const entry = teamObjectionMap.get(row.objectionKey) ?? {
      text: row.objectionText,
      category: row.category,
      total: 0,
      count: 0,
    };
    if (row.averageScore !== null) {
      entry.total += row.averageScore;
      entry.count += 1;
    }
    teamObjectionMap.set(row.objectionKey, entry);
  }

  const topWeakForTeam = Array.from(teamObjectionMap.entries())
    .map(([key, entry]) => ({
      text: entry.text,
      category: entry.category,
      averageScore: entry.count > 0 ? Math.round((entry.total / entry.count) * 10) / 10 : 0,
      attempts: agentRows
        .filter((row) => row.objectionKey === key)
        .reduce((sum, row) => sum + row.attempts, 0),
    }))
    .filter((item) => item.attempts > 0)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 10);

  return {
    librarySize: B2C_OBJECTION_LIBRARY.length,
    byCategory: categoryTotals,
    agentRows: agentRows.sort((a, b) => {
      if (a.userName !== b.userName) return a.userName.localeCompare(b.userName);
      return (a.averageScore ?? 0) - (b.averageScore ?? 0);
    }),
    topWeakForTeam,
  };
}

export function buildPoolForUser(
  profileObjections: string[],
  personalObjections: string[]
) {
  return buildObjectionPool(profileObjections, personalObjections);
}

export function enrichTrackerItem(item: ObjectionTrackerItem): ObjectionTrackerItem {
  const library = getLibraryObjectionByKey(item.text);
  if (!library) return item;
  return {
    ...item,
    category: library.category,
    libraryId: library.id,
    source: item.source ?? "library",
  };
}
