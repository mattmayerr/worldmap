"use client";

import { useEffect, useState } from "react";
import { IconTrophy } from "@/components/ui/Icons";
import { useSessionUser } from "@/hooks/useSessionUser";
import { skillTierBadgeClass, skillTierColor, MIN_SCORED_SESSIONS_FOR_SKILL } from "@/lib/progression-utils";
import type { LeaderboardEntry, LeaderboardResponse, LeaderboardSort } from "@/lib/progression-types";

function rankMedal(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function LeaderboardRow({ entry, sort }: { entry: LeaderboardEntry; sort: LeaderboardSort }) {
  const medal = rankMedal(entry.rank);
  const highlight = entry.isCurrentUser;

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
        highlight
          ? "border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20"
          : "border-white/[0.06] bg-white/[0.03]"
      }`}
    >
      <div className="flex w-8 shrink-0 justify-center text-sm font-bold tabular-nums text-slate-400">
        {medal ?? `#${entry.rank}`}
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
          highlight
            ? "bg-gradient-to-br from-blue-500 to-violet-600"
            : "bg-gradient-to-br from-slate-600 to-slate-700"
        }`}
      >
        {entry.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{entry.name}</p>
          {highlight && (
            <span className="shrink-0 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
              You
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {entry.xp.toLocaleString()} XP
          {entry.streakDays > 1 ? ` · ${entry.streakDays}-day streak` : ""}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {sort === "level" ? (
          <>
            <p className="text-lg font-bold tabular-nums text-white">
              {entry.prestigeCount > 0 ? (
                <span className="text-stone-400">P{entry.prestigeCount} · </span>
              ) : null}
              Lv {entry.level}
            </p>
            <span
              className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${skillTierBadgeClass(entry.skillTier)}`}
            >
              {entry.skillTierLabel}
            </span>
          </>
        ) : (
          <>
            <span
              className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${skillTierBadgeClass(entry.skillTier)}`}
            >
              {entry.skillTierLabel}
            </span>
            {entry.skillRating !== null ? (
              <p className={`mt-1 text-xs font-medium tabular-nums ${skillTierColor(entry.skillTier)}`}>
                {entry.skillRating}/100
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-500">Calibrating</p>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function LeaderboardPage() {
  const user = useSessionUser();
  const [sort, setSort] = useState<LeaderboardSort>("level");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/leaderboard?sort=${sort}`);
        const payload = await response.json();
        if (response.ok) setData(payload);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [sort]);

  const currentEntry = data?.entries.find((entry) => entry.isCurrentUser);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-lg animate-slide-up">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-blue-400">
            <IconTrophy className="h-5 w-5" />
            <p className="text-sm font-medium">Team standings</p>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gradient">Leaderboard</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            See how everyone stacks up on level and skill rank.
          </p>
        </div>

        <div className="glass-card mb-5 flex p-1">
          <button
            type="button"
            onClick={() => setSort("level")}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              sort === "level"
                ? "bg-blue-500/20 text-white ring-1 ring-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            By level
          </button>
          <button
            type="button"
            onClick={() => setSort("skill")}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              sort === "skill"
                ? "bg-violet-500/20 text-white ring-1 ring-violet-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            By skill rank
          </button>
        </div>

        {currentEntry && !loading && (
          <div className="glass-card mb-5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Your spot</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold tabular-nums text-white">#{currentEntry.rank}</p>
                <p className="text-sm text-slate-400">
                  Level {currentEntry.level} · {currentEntry.skillTierLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{currentEntry.xp.toLocaleString()} XP</p>
                {currentEntry.skillRating !== null && (
                  <p className="text-xs text-slate-500">{currentEntry.skillRating}/100 skill</p>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : data && data.entries.length > 0 ? (
          <ul className="space-y-2.5">
            {data.entries.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} sort={sort} />
            ))}
          </ul>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-slate-400">No agents on the board yet. Start practicing to show up here.</p>
          </div>
        )}

        {user && (
          <p className="mt-6 text-center text-xs text-slate-600">
            Level comes from practice XP. Skill rank measures call quality after{" "}
            {MIN_SCORED_SESSIONS_FOR_SKILL} scored calls.
          </p>
        )}
      </div>
    </div>
  );
}
