"use client";

import type { ImprovementArea, ImprovementExample, ImprovementExampleKind } from "@/lib/types";

const KIND_META: Record<
  ImprovementExampleKind,
  { label: string; className: string; dot: string }
> = {
  feedback: {
    label: "Coach feedback",
    className: "border-amber-500/20 bg-amber-500/10",
    dot: "bg-amber-400",
  },
  "your-response": {
    label: "From your call",
    className: "border-violet-500/20 bg-violet-500/10",
    dot: "bg-violet-400",
  },
  "better-approach": {
    label: "What to aim for",
    className: "border-emerald-500/20 bg-emerald-500/10",
    dot: "bg-emerald-400",
  },
  "phrase-to-avoid": {
    label: "Watch out for",
    className: "border-rose-500/20 bg-rose-500/10",
    dot: "bg-rose-400",
  },
};

function scoreColor(score: number | undefined): string {
  if (score === undefined) return "text-slate-400";
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}

function ExampleBlock({ example }: { example: ImprovementExample }) {
  const meta = KIND_META[example.kind];

  return (
    <div className={`rounded-xl border px-4 py-3.5 ${meta.className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </p>
        {example.score !== undefined && (
          <span className={`text-xs font-semibold tabular-nums ${scoreColor(example.score)}`}>
            {example.score}/10
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-white">{example.title}</p>
      {example.context && (
        <p className="mt-1.5 text-xs italic leading-relaxed text-slate-500">{example.context}</p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-slate-300">&ldquo;{example.body}&rdquo;</p>
    </div>
  );
}

interface ImprovementAreaModalProps {
  area: ImprovementArea;
  onClose: () => void;
}

export function ImprovementAreaModal({ area, onClose }: ImprovementAreaModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-surface-raised ring-1 ring-white/10 animate-slide-up"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="improvement-area-title"
      >
        <div className="border-b border-white/[0.06] px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
            Understanding this skill
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h2 id="improvement-area-title" className="text-xl font-bold text-white">
              {area.label}
            </h2>
            <p className={`shrink-0 text-2xl font-bold tabular-nums ${scoreColor(area.score)}`}>
              {area.score}
              <span className="text-sm font-normal text-slate-500">/10</span>
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{area.summary}</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Examples from your practice
          </p>
          {area.examples.length > 0 ? (
            area.examples.map((example) => <ExampleBlock key={example.id} example={example} />)
          ) : (
            <p className="text-sm text-slate-400">
              Complete more scored practice calls to see specific examples here.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] px-5 py-4">
          <button type="button" onClick={onClose} className="btn-primary w-full">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
