"use client";

import { FormEvent, useState } from "react";
import { AioaStatsPanel } from "@/components/AioaStatsPanel";
import { OBJECTION_CATEGORY_LABELS } from "@/lib/objection-library";
import type { AioaEvaluation, ObjectionGradingStatus, ObjectionTrackerItem } from "@/lib/types";

function scoreColor(score: number | undefined): string {
  if (score === undefined) return "text-slate-500";
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function getGradingStatus(
  item: ObjectionTrackerItem,
  statuses: ObjectionGradingStatus[]
): ObjectionGradingStatus | undefined {
  const key = item.text.trim().toLowerCase();
  return statuses.find((status) => status.objectionText.trim().toLowerCase() === key);
}

function statusLabel(
  item: ObjectionTrackerItem,
  grading: ObjectionGradingStatus | undefined,
  simplified: boolean
): string {
  if (item.status === "active") return simplified ? "Right now" : "In progress";
  if (item.score === undefined) return simplified ? "Not tried yet" : "Not tested yet";
  if (item.score >= 7) return simplified ? "Good job" : "Handled well";
  return simplified ? "Keep practicing" : "Needs work";
}

interface ObjectionPanelProps {
  items: ObjectionTrackerItem[];
  gradingStatuses: ObjectionGradingStatus[];
  userObjections: string[];
  poolSize: number;
  scoring: boolean;
  drillMode: boolean;
  simplified?: boolean;
  stickySidebar?: boolean;
  lastAioa?: AioaEvaluation | null;
  onPractice: (id: string) => void;
  onAddObjection: (text: string) => Promise<void>;
  onShuffle: () => void;
}

export function ObjectionPanel({
  items,
  gradingStatuses,
  userObjections,
  poolSize,
  scoring,
  drillMode,
  simplified = false,
  stickySidebar = false,
  lastAioa,
  onPractice,
  onAddObjection,
  onShuffle,
}: ObjectionPanelProps) {
  const [newObjection, setNewObjection] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const gradedItems = items.filter((item) => {
    const grading = getGradingStatus(item, gradingStatuses);
    return grading?.gradingEnabled && item.score !== undefined;
  });
  const weak = gradedItems.filter((item) => (item.score ?? 0) < 7);
  const userObjectionKeys = new Set(userObjections.map((text) => text.trim().toLowerCase()));

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!newObjection.trim()) return;

    setAdding(true);
    setAddError(null);
    try {
      await onAddObjection(newObjection.trim());
      setNewObjection("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add objection.");
    } finally {
      setAdding(false);
    }
  }

  const showAioa = simplified || stickySidebar;

  return (
    <aside
      className={
        stickySidebar
          ? "hidden h-full w-80 shrink-0 flex-col border-l border-white/[0.06] bg-white/[0.02] lg:flex"
          : `flex w-full shrink-0 flex-col lg:w-80 ${
              simplified
                ? "max-h-44 border-t border-white/[0.06] bg-white/[0.02] lg:max-h-none lg:border-l lg:border-t-0"
                : "max-h-56 border-t border-surface-border bg-surface-raised/40 lg:max-h-none lg:border-l lg:border-t-0"
            }`
      }
    >
      {showAioa && (
        <AioaStatsPanel aioa={lastAioa ?? null} scoring={scoring} />
      )}

      <div className={`shrink-0 px-4 py-3 ${stickySidebar ? "border-b border-white/[0.06]" : simplified ? "" : "border-b border-surface-border"}`}>
        <h3 className="text-sm font-semibold text-white">
          {simplified ? "Topics in this call" : "Objection tracker"}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {simplified
            ? `${items.length} things a customer might say`
            : drillMode
              ? "Drill mode — each objection is tested in sequence."
              : `${items.length} random from ${poolSize} B2C objections. Shuffle for a new set.`}
        </p>
        {!simplified && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onShuffle}
              className="rounded-lg bg-surface px-2.5 py-1 text-xs text-slate-300 ring-1 ring-surface-border hover:text-white"
            >
              Shuffle objections
            </button>
          </div>
        )}
        {!simplified && (
          <p className="mt-2 text-xs text-slate-400">
            {gradedItems.length}/{items.length} scored
            {weak.length > 0 && (
              <span className="text-amber-400"> · {weak.length} weak</span>
            )}
          </p>
        )}
        {!showAioa && scoring && (
          <p className="mt-2 text-xs text-accent">Processing your last response...</p>
        )}
      </div>

      {!simplified && (
        <div className="shrink-0 border-b border-surface-border px-4 py-3">
          <form onSubmit={(event) => void handleAdd(event)} className="space-y-2">
            <input
              value={newObjection}
              onChange={(event) => setNewObjection(event.target.value)}
              placeholder="Add your own objection to practice..."
              className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="submit"
              disabled={adding || !newObjection.trim()}
              className="w-full rounded-xl bg-accent/20 px-3 py-2 text-xs font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/30 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add to my list"}
            </button>
            {addError && <p className="text-xs text-red-300">{addError}</p>}
          </form>
        </div>
      )}

      <div
        className={`min-h-0 flex-1 p-3 ${
          stickySidebar
            ? "overflow-y-auto"
            : simplified
              ? "flex gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-x-visible lg:overflow-y-auto"
              : "overflow-y-auto"
        }`}
      >
        <ul className={`space-y-2 ${!stickySidebar && simplified ? "flex min-w-min gap-2 lg:min-w-0 lg:flex-col" : ""}`}>
          {items.map((item) => {
            const grading = getGradingStatus(item, gradingStatuses);
            const isPersonal = userObjectionKeys.has(item.text.trim().toLowerCase());
            const showScore = item.score !== undefined;

            return (
              <li key={item.id} className={!stickySidebar && simplified ? "w-56 shrink-0 lg:w-auto lg:shrink" : ""}>
                <button
                  type="button"
                  onClick={() => onPractice(item.id)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition ring-1 ${
                    item.status === "active"
                      ? simplified
                        ? "bg-blue-500/15 ring-blue-500/40"
                        : "bg-accent/10 ring-accent/40"
                      : item.status === "weak"
                        ? "bg-amber-500/10 ring-amber-500/30 hover:bg-amber-500/15"
                        : simplified
                          ? "glass-card !shadow-none hover:bg-white/[0.06]"
                          : "bg-surface ring-surface-border hover:ring-accent/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm leading-snug text-slate-200">{item.text}</p>
                      {!simplified && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.category && (
                            <span className="rounded bg-surface-border/80 px-1.5 py-0.5 text-[10px] text-slate-400">
                              {OBJECTION_CATEGORY_LABELS[item.category]}
                            </span>
                          )}
                          {isPersonal && (
                            <span className="text-[10px] uppercase tracking-wide text-violet-300">
                              Your objection
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${scoreColor(item.score)}`}>
                      {showScore && item.score !== undefined ? `${item.score}/10` : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {statusLabel(item, grading, simplified)}
                  </p>
                  {item.feedback && showScore && !simplified && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.feedback}</p>
                  )}
                  {!simplified && (
                    <p className="mt-2 text-xs font-medium text-accent/80">Click to practice →</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {!simplified && weak.length > 0 && (
        <div className="shrink-0 border-t border-surface-border px-4 py-3">
          <p className="text-xs text-amber-300">
            Focus on your lowest scores — click an objection to drill it in the call.
          </p>
        </div>
      )}
    </aside>
  );
}
