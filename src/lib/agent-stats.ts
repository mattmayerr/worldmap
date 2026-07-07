import { listAllExamples, isGradingEnabledForObjection, getEffectiveReviewStatus } from "./objection-examples";
import {
  computeCategorySummary,
  computeObjectionPerformance,
} from "./objection-stats";
import { listSessionsForUser } from "./practice-sessions";
import {
  computeImprovementAreas,
  getPriorityImprovementAreas,
} from "./improvement-areas";
import type { AgentStats, ObjectionTrackerItem } from "./types";

export async function computeAgentStats(userId: string): Promise<AgentStats> {
  const [sessions, examples] = await Promise.all([
    listSessionsForUser(userId),
    listAllExamples(),
  ]);

  const userExamples = examples.filter((item) => item.userId === userId);
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const sessionsLast7 = sessions.filter(
    (session) => new Date(session.createdAt).getTime() >= sevenDaysAgo
  );

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

  const performance = computeObjectionPerformance(sessions, examples, userId);

  const objectionProgress = performance
    .filter((item) => item.attempts > 0 || item.examplesSubmitted > 0)
    .map((item) => ({
      text: item.objectionText,
      category: item.category,
      timesPracticed: item.attempts,
      bestScore: item.bestScore,
      averageScore: item.averageScore,
      lastPracticedAt: item.lastPracticedAt,
      gradingEnabled: isGradingEnabledForObjection(examples, item.objectionText),
      goodExamples: examples.filter(
        (ex) => ex.objectionKey === item.objectionKey && getEffectiveReviewStatus(ex) === "good"
      ).length,
      examplesSubmitted: item.examplesSubmitted,
      latestFeedback: item.latestFeedback,
    }))
    .sort((a, b) => {
      if (a.gradingEnabled !== b.gradingEnabled) return a.gradingEnabled ? 1 : -1;
      if (a.averageScore !== null && b.averageScore !== null) return a.averageScore - b.averageScore;
      if (a.averageScore !== null) return -1;
      if (b.averageScore !== null) return 1;
      return b.timesPracticed - a.timesPracticed;
    });

  const objectionByCategory = computeCategorySummary(performance);

  const recentFeedback = scoredSessions.slice(0, 5).map((session) => ({
    date: session.createdAt,
    overallScore: session.debrief!.overallScore,
    strengths: session.debrief!.strengths.slice(0, 3),
    improvements: session.debrief!.improvements.slice(0, 3),
  }));

  const improvementAreas = getPriorityImprovementAreas(
    computeImprovementAreas(sessions, userExamples)
  );

  return {
    totalSessions: sessions.length,
    sessionsLast7Days: sessionsLast7.length,
    averageScore,
    scoreTrend,
    objectionProgress,
    objectionByCategory,
    recentFeedback,
    examplesSubmitted: userExamples.length,
    examplesApproved: userExamples.filter((item) => getEffectiveReviewStatus(item) === "good").length,
    improvementAreas,
  };
}

export function extractActiveObjectionResponse(
  conversation: { role: string; content: string }[],
  objections: ObjectionTrackerItem[]
): { objectionText: string; agentResponse: string; prospectMessage: string } | null {
  const active = objections.find((item) => item.status === "active");
  if (!active) return null;

  const lastUserIndex = [...conversation].reverse().findIndex((message) => message.role === "user");
  if (lastUserIndex === -1) return null;

  const userIndex = conversation.length - 1 - lastUserIndex;
  const agentResponse = conversation[userIndex]?.content ?? "";
  if (!agentResponse.trim()) return null;

  let prospectMessage = "";
  for (let index = userIndex - 1; index >= 0; index -= 1) {
    if (conversation[index].role === "assistant") {
      prospectMessage = conversation[index].content;
      break;
    }
  }

  return {
    objectionText: active.text,
    agentResponse,
    prospectMessage,
  };
}
