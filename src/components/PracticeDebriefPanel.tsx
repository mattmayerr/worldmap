"use client";

import type { ReactNode } from "react";
import type { PracticeDebrief } from "@/lib/types";

function ScoreBadge({ score }: { score: number | undefined }) {
  const safeScore = typeof score === "number" && !Number.isNaN(score) ? score : 0;
  const color =
    safeScore >= 8
      ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/30"
      : safeScore >= 6
        ? "bg-amber-500/20 text-amber-200 ring-amber-500/30"
        : "bg-red-500/20 text-red-200 ring-red-500/30";

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${color}`}>
      {safeScore}/10
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function BulletList({ items, tone }: { items?: string[]; tone?: "good" | "bad" | "neutral" }) {
  const safeItems = items ?? [];
  if (safeItems.length === 0) {
    return <p className="text-sm text-slate-500">No notes for this section.</p>;
  }

  const bulletColor =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-amber-400"
        : "text-slate-500";

  return (
    <ul className="space-y-2">
      {safeItems.map((item, index) => (
        <li key={index} className="flex gap-2 text-sm leading-relaxed text-slate-300">
          <span className={`mt-0.5 ${bulletColor}`}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface PracticeDebriefPanelProps {
  debrief: PracticeDebrief | null;
  loading?: boolean;
  sessionSaved?: boolean;
  xpEarned?: number | null;
  simplified?: boolean;
  onClose: () => void;
  onNewCall: () => void;
}

export function PracticeDebriefPanel({
  debrief,
  loading,
  sessionSaved,
  xpEarned,
  simplified = false,
  onClose,
  onNewCall,
}: PracticeDebriefPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-raised ring-1 ring-surface-border">
        <div className="border-b border-surface-border px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {simplified ? "Your results" : "Call debrief"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {simplified ? "How you did" : "Practice session review"}
              </h2>
              {debrief && (
                <p className="mt-1 text-sm text-slate-400">
                  {!simplified && (
                    <>
                      Sentiment: <span className="text-slate-200">{debrief.sentiment.label}</span>
                    </>
                  )}
                  {sessionSaved && (
                    <span className={simplified ? "text-emerald-400" : "ml-2 text-emerald-400"}>
                      {simplified ? "Saved to My Progress" : "· Saved to your history"}
                    </span>
                  )}
                  {xpEarned !== null && xpEarned !== undefined && xpEarned > 0 && (
                    <span className="ml-2 font-medium text-blue-400">+{xpEarned} XP</span>
                  )}
                </p>
              )}
            </div>
            {debrief && <ScoreBadge score={debrief.overallScore} />}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {loading || !debrief ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-slate-400">
                {simplified ? "Reviewing your call..." : "Analyzing tone, language, and objection handling..."}
              </p>
            </div>
          ) : (
            <>
              <Section title={simplified ? "Overall" : "Overall sentiment"}>
                <p className="text-sm leading-relaxed text-slate-300">{debrief.sentiment.summary}</p>
              </Section>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-surface p-4 ring-1 ring-surface-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400">Tone</p>
                    <ScoreBadge score={debrief.tone.score} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{debrief.tone.summary}</p>
                </div>
                <div className="rounded-xl bg-surface p-4 ring-1 ring-surface-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400">Verbage</p>
                    <ScoreBadge score={debrief.verbage.score} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{debrief.verbage.summary}</p>
                </div>
                <div className="rounded-xl bg-surface p-4 ring-1 ring-surface-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400">Objections</p>
                    <ScoreBadge score={debrief.objectionHandling.score} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {debrief.objectionHandling.summary}
                  </p>
                </div>
              </div>

              {debrief.verbage?.examples && debrief.verbage.examples.length > 0 && (
                <Section title="Language examples">
                  <BulletList items={debrief.verbage.examples} tone="neutral" />
                </Section>
              )}

              <Section title="What you did well">
                <BulletList items={debrief.strengths} tone="good" />
              </Section>

              <Section title="What to improve">
                <BulletList items={debrief.improvements} tone="bad" />
              </Section>

              <Section title="Missed opportunities">
                <BulletList items={debrief.missedOpportunities} tone="bad" />
              </Section>

              <Section title="Next practice focus">
                <BulletList items={debrief.nextSteps} tone="good" />
              </Section>
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-surface-border px-6 py-4">
          <button
            type="button"
            onClick={onNewCall}
            className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            {simplified ? "Practice again" : "Start new call"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 ring-1 ring-surface-border transition hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
