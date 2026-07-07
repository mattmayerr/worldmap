"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PrestigePanel } from "@/components/PrestigePanel";
import { ImprovementAreaModal } from "@/components/ImprovementAreaModal";
import { IconCheckCircle, IconSparkles } from "@/components/ui/Icons";
import { useSessionUser } from "@/hooks/useSessionUser";
import { skillTierBadgeClass, isMaxLevel } from "@/lib/progression-utils";
import type { ProgressionSummary } from "@/lib/progression-types";
import type { AgentStats, ImprovementArea, PracticeSessionSummary } from "@/lib/types";

function scoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  if (score >= 8) return "Great";
  if (score >= 6) return "Good";
  return "Keep going";
}

function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-slate-500";
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}

function scoreRingColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "from-slate-600 to-slate-700";
  if (score >= 8) return "from-emerald-400 to-emerald-600";
  if (score >= 6) return "from-amber-400 to-amber-600";
  return "from-rose-400 to-rose-600";
}

function statusLabel(status: ImprovementArea["status"]): string {
  if (status === "critical") return "Needs work";
  if (status === "developing") return "Building";
  return "Strong";
}

function statusBadgeClass(status: ImprovementArea["status"]): string {
  if (status === "critical") return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  if (status === "developing") return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
  return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
}

function ImprovementAreaCard({
  area,
  onSelect,
}: {
  area: ImprovementArea;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition hover:border-blue-500/30 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{area.label}</p>
            <span
              className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${statusBadgeClass(area.status)}`}
            >
              {statusLabel(area.status)}
            </span>
          </div>
          <p className={`shrink-0 text-2xl font-bold tabular-nums ${scoreColor(area.score)}`}>
            {area.score}
            <span className="text-sm font-normal text-slate-500">/10</span>
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{area.summary}</p>
        <p className="mt-3 rounded-xl bg-blue-500/10 px-3 py-2.5 text-xs leading-relaxed text-blue-100/90">
          <span className="font-semibold text-blue-300">Try this: </span>
          {area.tip}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-600">
            Based on {area.dataPoints} recent {area.dataPoints === 1 ? "review" : "reviews"}
          </p>
          <span className="text-xs font-medium text-blue-400">
            See examples →
          </span>
        </div>
      </button>
    </li>
  );
}

export default function ProgressPage() {
  const user = useSessionUser();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [progression, setProgression] = useState<ProgressionSummary | null>(null);
  const [sessions, setSessions] = useState<PracticeSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<ImprovementArea | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, sessionsRes] = await Promise.all([
          fetch("/api/practice/stats"),
          fetch("/api/practice/sessions"),
        ]);
        const statsData = await statsRes.json();
        const sessionsData = await sessionsRes.json();
        if (statsRes.ok) {
          setStats(statsData.stats);
          if (statsData.progression) setProgression(statsData.progression);
        }
        if (sessionsRes.ok) setSessions(sessionsData.sessions ?? []);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const firstName = user?.name.split(" ")[0] ?? "there";
  const latestTip = stats?.recentFeedback[0]?.improvements[0];
  const improvementAreas = stats?.improvementAreas ?? [];
  const weakSpots = stats?.objectionProgress
    .filter((item) => item.bestScore !== null && item.bestScore < 7)
    .slice(0, 3);
  const hasScoredCalls = (stats?.totalSessions ?? 0) > 0 && stats?.averageScore !== null;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-lg animate-slide-up">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-400">Your dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gradient">
            Hey, {firstName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Here&apos;s how your practice calls are shaping up.
          </p>
        </div>

        {progression && (
          <div className="glass-card mb-5 space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Level</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                  {progression.level}
                  {progression.prestigeCount > 0 ? (
                    <span className="ml-2 text-base font-semibold text-stone-400">
                      · {progression.prestigeLabel}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{progression.xp.toLocaleString()} XP total</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Skill</p>
                <span
                  className={`mt-1 inline-block rounded-full border px-3 py-1 text-sm font-semibold ${skillTierBadgeClass(progression.skillTier)}`}
                >
                  {progression.skillTierLabel}
                </span>
                {progression.skillRating !== null ? (
                  <p className="mt-1 text-xs text-slate-500">{progression.skillRating}/100</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {progression.scoredSessionCount}/{progression.minSessionsForSkill} calls to rank
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span>
                  {isMaxLevel(progression.level)
                    ? "Max level reached"
                    : `Progress to level ${progression.level + 1}`}
                </span>
                <span>
                  {isMaxLevel(progression.level)
                    ? "Prestige ready"
                    : `${progression.levelProgress.xpIntoLevel} / ${progression.levelProgress.xpNeededForLevel} XP`}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${progression.levelProgress.progressPercent}%` }}
                />
              </div>
            </div>

            {progression.streakDays > 1 && (
              <p className="text-xs text-blue-300">
                {progression.streakDays}-day practice streak — keep it going!
              </p>
            )}

            {progression.skillTier === "calibrating" && (
              <p className="text-xs leading-relaxed text-slate-500">
                Skill rank is separate from level — it measures how well you handle calls, not how
                many you&apos;ve done. Finish {progression.minSessionsForSkill} scored calls to unlock
                yours.
              </p>
            )}

            <Link
              href="/profile"
              className="inline-flex text-sm font-medium text-blue-400 transition hover:text-blue-300"
            >
              Customize profile & cosmetics →
            </Link>

            <PrestigePanel
              progression={progression}
              onPrestiged={(updated) => setProgression(updated)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Calls</p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-white">
              {stats?.totalSessions ?? 0}
            </p>
          </div>
          <div className="glass-card relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Average</p>
            <p className={`mt-2 text-4xl font-bold tabular-nums ${scoreColor(stats?.averageScore)}`}>
              {stats?.averageScore !== null && stats?.averageScore !== undefined
                ? `${stats.averageScore}`
                : "—"}
              {stats?.averageScore !== null && stats?.averageScore !== undefined && (
                <span className="text-lg text-slate-500">/10</span>
              )}
            </p>
            {stats?.averageScore !== null && stats?.averageScore !== undefined && (
              <p className="mt-1 text-xs text-slate-500">{scoreLabel(stats.averageScore)}</p>
            )}
          </div>
        </div>

        {latestTip && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                <IconSparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
                  Tip for your next call
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-50/90">{latestTip}</p>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card mt-5 p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">Areas to improve</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Pulled from your practice debriefs and AIOA scores. Tap any area to see real
              examples from your calls.
            </p>
          </div>

          {improvementAreas.length > 0 ? (
            <ul className="space-y-3">
              {improvementAreas.map((area) => (
                <ImprovementAreaCard
                  key={area.id}
                  area={area}
                  onSelect={() => setSelectedArea(area)}
                />
              ))}
            </ul>
          ) : hasScoredCalls ? (
            <div className="rounded-xl bg-emerald-500/10 px-4 py-4 text-center">
              <p className="text-sm font-medium text-emerald-200">Looking solid across the board</p>
              <p className="mt-1 text-xs text-slate-400">
                No major weak spots right now — keep practicing to stay sharp.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-white/[0.03] px-4 py-4 text-center">
              <p className="text-sm text-slate-400">
                Finish a few scored practice calls to unlock personalized feedback on tone, AIOA,
                and objection handling.
              </p>
            </div>
          )}
        </div>

        {weakSpots && weakSpots.length > 0 && (
          <div className="glass-card mt-5 p-5">
            <p className="text-sm font-semibold text-white">Tough objections</p>
            <p className="mt-1 text-xs text-slate-500">Specific objection types to drill</p>
            <ul className="mt-3 space-y-2.5">
              {weakSpots.map((item) => (
                <li
                  key={item.text}
                  className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3.5 py-3 text-sm text-slate-300"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-white">Recent calls</h2>
          {sessions.length === 0 ? (
            <div className="glass-card mt-3 p-6 text-center">
              <p className="text-sm text-slate-400">
                No saved calls yet. Finish a practice call to see your results here.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {sessions.slice(0, 8).map((session) => (
                <li
                  key={session.id}
                  className="glass-card flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[0.05]"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${scoreRingColor(session.overallScore)}`}
                  >
                    {session.overallScore !== undefined ? session.overallScore : "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">{session.userTurns} responses</p>
                  </div>
                  {session.overallScore !== undefined && session.overallScore >= 7 && (
                    <IconCheckCircle className="h-5 w-5 shrink-0 text-emerald-400/80" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link href="/" className="btn-primary mt-8 w-full shadow-glow-sm">
          Practice again
        </Link>
      </div>

      {selectedArea && (
        <ImprovementAreaModal area={selectedArea} onClose={() => setSelectedArea(null)} />
      )}
    </div>
  );
}
