"use client";

import { useEffect, useState } from "react";
import { OBJECTION_CATEGORY_LABELS } from "@/lib/objection-library";
import type { ObjectionCategory } from "@/lib/types";

interface AdminObjectionStats {
  librarySize: number;
  byCategory: Array<{
    category: ObjectionCategory;
    label: string;
    totalAttempts: number;
    teamAverageScore: number | null;
  }>;
  agentRows: Array<{
    userId: string;
    userName: string;
    email: string;
    objectionText: string;
    category: ObjectionCategory;
    attempts: number;
    averageScore: number | null;
    bestScore: number | null;
    lastPracticedAt: string | null;
  }>;
  topWeakForTeam: Array<{
    text: string;
    category: ObjectionCategory;
    averageScore: number;
    attempts: number;
  }>;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

export function AdminObjectionStatsPanel() {
  const [stats, setStats] = useState<AdminObjectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/admin/objection-stats");
        const data = await response.json();
        if (response.ok) setStats(data.stats);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <section className="mb-8 rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
        <p className="text-sm text-slate-500">Loading B2C objection stats...</p>
      </section>
    );
  }

  if (!stats) return null;

  const agents = Array.from(
    new Map(stats.agentRows.map((row) => [row.userId, row.userName])).entries()
  );

  const filteredRows =
    selectedAgent === "all"
      ? stats.agentRows
      : stats.agentRows.filter((row) => row.userId === selectedAgent);

  return (
    <section className="mb-8 rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
      <h2 className="text-sm font-semibold text-white">B2C objection performance by agent</h2>
      <p className="mt-1 text-xs text-slate-500">
        {stats.librarySize} standard objections in the library. Track how each agent handles
        price, trust, timing, and other common B2C pushback.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {stats.byCategory
          .filter((item) => item.totalAttempts > 0)
          .map((item) => (
            <div
              key={item.category}
              className="rounded-xl bg-surface px-3 py-2 text-xs ring-1 ring-surface-border"
            >
              <span className="text-slate-400">{item.label}</span>
              <span className="ml-2 text-white">{item.totalAttempts} attempts</span>
              {item.teamAverageScore !== null && (
                <span className={`ml-2 ${scoreColor(item.teamAverageScore)}`}>
                  avg {item.teamAverageScore}
                </span>
              )}
            </div>
          ))}
      </div>

      {stats.topWeakForTeam.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Team weakest objections
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {stats.topWeakForTeam.map((item) => (
              <li
                key={item.text}
                className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 ring-1 ring-amber-500/20"
              >
                {item.text} · {OBJECTION_CATEGORY_LABELS[item.category]} · {item.averageScore}/10
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <label className="text-xs text-slate-500">
          Filter by agent{" "}
          <select
            value={selectedAgent}
            onChange={(event) => setSelectedAgent(event.target.value)}
            className="ml-2 rounded-lg border border-surface-border bg-surface px-2 py-1 text-xs text-white"
          >
            <option value="all">All agents</option>
            {agents.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredRows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No objection practice data yet. Agents need to complete practice sessions with scored
          objections.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2 pr-4">Agent</th>
                <th className="pb-2 pr-4">Objection</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2 pr-4">Avg</th>
                <th className="pb-2">Best</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {filteredRows.map((row) => (
                <tr
                  key={`${row.userId}-${row.objectionText}`}
                  className="border-t border-surface-border"
                >
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-white">{row.userName}</div>
                  </td>
                  <td className="max-w-xs py-2.5 pr-4 text-slate-300">{row.objectionText}</td>
                  <td className="py-2.5 pr-4 text-xs text-slate-500">
                    {OBJECTION_CATEGORY_LABELS[row.category]}
                  </td>
                  <td className="py-2.5 pr-4">{row.attempts}</td>
                  <td className={`py-2.5 pr-4 ${scoreColor(row.averageScore)}`}>
                    {row.averageScore !== null ? `${row.averageScore}/10` : "—"}
                  </td>
                  <td className={`py-2.5 ${scoreColor(row.bestScore)}`}>
                    {row.bestScore !== null ? `${row.bestScore}/10` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
