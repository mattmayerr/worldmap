"use client";

import { useEffect, useState } from "react";
import type { AgentStats } from "@/lib/types";

function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

export default function StatsPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/practice/stats");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load stats.");
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading your stats...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <p className="text-sm text-red-300">{error || "No stats available."}</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">My progress</h1>
          <p className="mt-2 text-sm text-slate-400">
            Personal practice stats, objection progress, and feedback from your saved sessions.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total sessions", value: stats.totalSessions },
            { label: "Sessions (7 days)", value: stats.sessionsLast7Days },
            {
              label: "Average score",
              value: stats.averageScore !== null ? `${stats.averageScore}/10` : "—",
            },
            {
              label: "Examples contributed",
              value: `${stats.examplesApproved}/${stats.examplesSubmitted} approved`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border"
            >
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {stats.scoreTrend.length > 0 && (
          <section className="mb-8 rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
            <h2 className="text-sm font-semibold text-white">Score trend</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {stats.scoreTrend.map((point) => (
                <div
                  key={point.date}
                  className="rounded-xl bg-surface px-4 py-3 text-center ring-1 ring-surface-border"
                >
                  <p className="text-xs text-slate-500">{point.date}</p>
                  <p className={`mt-1 text-lg font-semibold ${scoreColor(point.averageScore)}`}>
                    {point.averageScore}
                  </p>
                  <p className="text-xs text-slate-500">{point.sessionCount} sessions</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {stats.objectionByCategory.length > 0 && (
          <section className="mb-8 rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
            <h2 className="text-sm font-semibold text-white">Progress by category</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.objectionByCategory.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-xl bg-surface px-4 py-3 ring-1 ring-surface-border"
                >
                  <p className="text-sm font-medium text-white">{cat.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {cat.practiced} objections practiced
                    {cat.weakCount > 0 && ` · ${cat.weakCount} need work`}
                  </p>
                  <p className={`mt-2 text-lg font-semibold ${scoreColor(cat.averageScore)}`}>
                    {cat.averageScore !== null ? `${cat.averageScore}/10 avg` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
            <h2 className="text-sm font-semibold text-white">Objection progress</h2>
            <ul className="mt-4 space-y-3">
              {stats.objectionProgress.length === 0 ? (
                <li className="text-sm text-slate-500">No objection practice yet.</li>
              ) : (
                stats.objectionProgress.map((item) => (
                  <li
                    key={item.text}
                    className="rounded-xl bg-surface px-4 py-3 ring-1 ring-surface-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-200">{item.text}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                          {item.category.replace("_", " ")}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold ${scoreColor(item.bestScore)}`}>
                        {item.gradingEnabled && item.bestScore !== null
                          ? `${item.bestScore}/10`
                          : "—"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.gradingEnabled
                        ? `Practiced ${item.timesPracticed} times${item.averageScore !== null ? ` · avg ${item.averageScore}/10` : ""}`
                        : `${item.goodExamples}/10 verified examples before scoring`}
                      {item.examplesSubmitted > 0 &&
                        ` · ${item.examplesSubmitted} you submitted`}
                    </p>
                    {item.latestFeedback && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {item.latestFeedback}
                      </p>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
            <h2 className="text-sm font-semibold text-white">Recent session feedback</h2>
            <ul className="mt-4 space-y-4">
              {stats.recentFeedback.length === 0 ? (
                <li className="text-sm text-slate-500">
                  Complete a practice call and use &quot;End call &amp; review&quot; to see feedback
                  here.
                </li>
              ) : (
                stats.recentFeedback.map((entry) => (
                  <li
                    key={entry.date}
                    className="rounded-xl bg-surface px-4 py-3 ring-1 ring-surface-border"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        {new Date(entry.date).toLocaleString()}
                      </p>
                      <p className={`text-sm font-semibold ${scoreColor(entry.overallScore)}`}>
                        {entry.overallScore}/10
                      </p>
                    </div>
                    {entry.strengths.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-emerald-300">Strengths</p>
                        <ul className="mt-1 space-y-1 text-xs text-slate-400">
                          {entry.strengths.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.improvements.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-amber-300">Improve</p>
                        <ul className="mt-1 space-y-1 text-xs text-slate-400">
                          {entry.improvements.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
