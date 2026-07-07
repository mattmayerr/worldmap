"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAgentUser, useSessionUser } from "@/hooks/useSessionUser";
import type { PracticeSessionSummary } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function scoreBadge(score: number | undefined): string {
  if (score === undefined) return "text-slate-500";
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

export default function HistoryPage() {
  const router = useRouter();
  const user = useSessionUser();
  const [sessions, setSessions] = useState<PracticeSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isAgentUser(user)) {
      router.replace("/progress");
    }
  }, [user, router]);

  useEffect(() => {
    if (user && isAgentUser(user)) return;

    async function load() {
      try {
        const response = await fetch("/api/practice/sessions");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load history.");
        setSessions(data.sessions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  if (!user || isAgentUser(user)) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Practice history</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your saved practice sessions — pick up where you left off at home or at work.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl bg-surface-raised p-8 text-center ring-1 ring-surface-border">
            <p className="text-sm text-slate-400">No saved sessions yet.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white"
            >
              Start practicing
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-2xl bg-surface-raised px-5 py-4 ring-1 ring-surface-border"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white capitalize">
                      {session.mode}
                      {session.objectionDrill && (
                        <span className="ml-2 text-xs text-amber-400">· objection drill</span>
                      )}
                      {session.voiceMode && (
                        <span className="ml-2 text-xs text-emerald-400">· voice</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(session.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${scoreBadge(session.overallScore)}`}>
                      {session.overallScore !== undefined ? `${session.overallScore}/10` : "—"}
                    </p>
                    <p className="text-xs text-slate-500">overall score</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>{session.userTurns} your turns</span>
                  <span>{session.objectionCount} objections scored</span>
                  {session.weakObjections > 0 && (
                    <span className="text-amber-400">{session.weakObjections} weak</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
