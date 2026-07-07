"use client";

import type { AioaEvaluation } from "@/lib/types";
import { aioaStepLabel } from "@/lib/aioa-utils";

export interface LiveRebuttalEntry {
  id: string;
  objectionText: string;
  overallScore: number;
  aioa: AioaEvaluation;
  summary: string;
  feedback: string;
}

const STEPS = [
  { key: "agree" as const, label: "Agree" },
  { key: "isolate" as const, label: "Isolate" },
  { key: "overcome" as const, label: "Overcome" },
  { key: "askForMoney" as const, label: "Ask" },
];

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}

function scoreBg(score: number): string {
  if (score >= 8) return "border-emerald-500/30 bg-emerald-500/10";
  if (score >= 6) return "border-amber-500/30 bg-amber-500/10";
  return "border-rose-500/30 bg-rose-500/10";
}

function truncate(text: string, max = 100): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

interface LiveRebuttalFeedbackProps {
  latest: LiveRebuttalEntry | null;
  history: LiveRebuttalEntry[];
  scoring?: boolean;
  compact?: boolean;
}

export function LiveRebuttalFeedback({
  latest,
  history,
  scoring,
  compact,
}: LiveRebuttalFeedbackProps) {
  if (!latest && !scoring) return null;

  return (
    <div className={compact ? "space-y-2" : "mx-auto mb-4 max-w-3xl space-y-2"}>
      {scoring && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-200">
          Scoring your rebuttal…
        </div>
      )}

      {latest && (
        <div className={`rounded-2xl border px-4 py-3.5 ${scoreBg(latest.overallScore)}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Live objection score
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                &ldquo;{truncate(latest.objectionText)}&rdquo;
              </p>
            </div>
            <p className={`shrink-0 text-2xl font-bold tabular-nums ${scoreColor(latest.overallScore)}`}>
              {latest.overallScore}
              <span className="text-sm font-normal text-slate-500">/10</span>
            </p>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {STEPS.map(({ key, label }) => {
              const step = latest.aioa[key];
              return (
                <div
                  key={key}
                  className="rounded-lg bg-black/20 px-1.5 py-1.5 text-center"
                  title={step.summary || label}
                >
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className={`text-sm font-bold tabular-nums ${scoreColor(step.score)}`}>
                    {step.score}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-tight text-slate-500">
                    {step.detected ? aioaStepLabel(step) : "Missing"}
                  </p>
                </div>
              );
            })}
          </div>

          {latest.summary && (
            <p className="mt-3 text-xs leading-relaxed text-slate-300">{latest.summary}</p>
          )}
        </div>
      )}

      {!compact && history.length > 1 && (
        <details className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2">
          <summary className="cursor-pointer text-xs text-slate-500">
            Earlier rebuttals this call ({history.length - 1})
          </summary>
          <ul className="mt-2 space-y-2 border-t border-white/[0.06] pt-2">
            {history.slice(1, 6).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-400">{truncate(entry.objectionText, 60)}</span>
                <span className={`shrink-0 font-semibold tabular-nums ${scoreColor(entry.overallScore)}`}>
                  {entry.overallScore}/10
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
