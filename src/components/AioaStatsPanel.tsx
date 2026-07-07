"use client";

import type { AioaEvaluation } from "@/lib/types";
import { aioaStepLabel } from "@/lib/aioa-utils";

const STEPS = [
  { key: "agree", label: "Agree", hint: "Acknowledge their concern" },
  { key: "isolate", label: "Isolate", hint: "Confirm the real blocker" },
  { key: "overcome", label: "Overcome", hint: "Strong rebuttal" },
  { key: "askForMoney", label: "Ask", hint: "Ask for the sale" },
] as const;

function stepScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}

function stepBarColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-amber-500";
  return "bg-rose-500";
}

interface AioaStatsPanelProps {
  aioa: AioaEvaluation | null;
  scoring?: boolean;
  compact?: boolean;
}

export function AioaStatsPanel({ aioa, scoring, compact }: AioaStatsPanelProps) {
  return (
    <div className={compact ? "px-3 py-2" : "shrink-0 border-b border-white/[0.06] px-4 py-4"}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">AIOA</h3>
        {aioa && (
          <span className="text-xs font-medium text-slate-500">
            Overall <span className="text-white">{aioa.overallScore}/10</span>
          </span>
        )}
      </div>
      {!compact && (
        <p className="mt-0.5 text-[11px] text-slate-500">
          Agree · Isolate · Overcome · Ask for the money
        </p>
      )}

      {scoring && (
        <p className="mt-2 text-xs text-blue-400">Scoring your last response...</p>
      )}

      <div className={`mt-3 grid grid-cols-4 gap-2 ${compact ? "gap-1.5" : ""}`}>
        {STEPS.map(({ key, label, hint }) => {
          const step = aioa?.[key];
          const score = step?.score ?? 0;
          const detected = step?.detected ?? false;

          return (
            <div
              key={key}
              className={`rounded-xl ${compact ? "px-1 py-1.5" : "px-2 py-2.5"} ${
                detected ? "bg-white/[0.06] ring-1 ring-white/[0.08]" : "bg-white/[0.02]"
              }`}
              title={hint}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p
                className={`${compact ? "text-base" : "text-xl"} font-bold tabular-nums ${
                  aioa ? stepScoreColor(score) : "text-slate-600"
                }`}
              >
                {aioa ? score : "—"}
              </p>
              {!compact && (
                <>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${aioa ? stepBarColor(score) : "bg-slate-700"}`}
                      style={{ width: aioa ? `${score * 10}%` : "0%" }}
                    />
                  </div>
                  <p className="mt-1 text-[9px] text-slate-600">
                    {aioa ? (detected ? aioaStepLabel(step!) : "Missing") : "Waiting"}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {aioa?.summary && (
        <p className={`leading-relaxed text-slate-400 ${compact ? "mt-2 text-[11px]" : "mt-3 text-xs"}`}>
          {aioa.summary}
        </p>
      )}
    </div>
  );
}
