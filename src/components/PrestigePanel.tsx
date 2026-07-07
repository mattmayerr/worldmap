"use client";

import { useState } from "react";
import type { CosmeticDefinition } from "@/lib/cosmetics";
import type { ProgressionSummary } from "@/lib/progression-types";
import { PrestigeCelebrateModal } from "@/components/PrestigeCelebrateModal";

interface PrestigePanelProps {
  progression: ProgressionSummary;
  onPrestiged: (progression: ProgressionSummary) => void;
}

export function PrestigePanel({ progression, onPrestiged }: PrestigePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    prestigeCount: number;
    unlockedDetails: CosmeticDefinition[];
  } | null>(null);

  const atMaxPrestige = progression.prestigeCount >= progression.maxPrestige;

  async function handlePrestige() {
    if (!progression.canPrestige || loading) return;

    const confirmed = window.confirm(
      `Prestige resets your level to 1 (skill rank stays). You keep all cosmetics you've earned and unlock exclusive Tour ${progression.prestigeCount + 1} rewards.\n\nReady to prestige?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/progression/prestige", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to prestige.");
      }
      onPrestiged(data.progression);
      setCelebration({
        prestigeCount: data.result.prestigeCount,
        unlockedDetails: data.unlockedDetails ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prestige.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-stone-600/30 bg-gradient-to-br from-stone-800/20 to-stone-900/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Prestige</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-stone-100">
              {progression.prestigeCount}
              <span className="text-base font-semibold text-stone-500">
                {" "}
                / {progression.maxPrestige}
              </span>
            </p>
            {progression.prestigeLabel ? (
              <p className="mt-0.5 text-xs font-semibold text-amber-500/90">
                {progression.prestigeLabel}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-stone-500">No tours completed yet</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Max level</p>
            <p className="mt-1 text-lg font-bold text-stone-200">{progression.maxLevel}</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Hit level {progression.maxLevel}, then prestige to reset your level and earn rugged
          exclusive badges and rings — one set per tour, up to {progression.maxPrestige} times.
          Skill rank and all unlocked cosmetics stay.
        </p>

        {progression.canPrestige ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void handlePrestige()}
            className="mt-4 w-full rounded-xl border border-stone-500/40 bg-stone-800/50 px-4 py-3 text-sm font-bold uppercase tracking-wide text-stone-100 transition hover:border-amber-600/50 hover:bg-stone-700/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Resetting…" : `Prestige — earn Tour ${progression.prestigeCount + 1} rewards`}
          </button>
        ) : atMaxPrestige ? (
          <div className="mt-4 rounded-xl border border-amber-600/30 bg-amber-950/20 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-amber-200">Maximum prestige reached</p>
            <p className="mt-1 text-xs text-stone-500">Ten tours complete. Legend status.</p>
          </div>
        ) : progression.level >= progression.maxLevel ? null : (
          <p className="mt-4 text-xs text-stone-500">
            Reach level {progression.maxLevel} to unlock your next prestige.
          </p>
        )}

        {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
      </div>

      {celebration ? (
        <PrestigeCelebrateModal
          prestigeCount={celebration.prestigeCount}
          unlockedDetails={celebration.unlockedDetails}
          onClose={() => setCelebration(null)}
        />
      ) : null}
    </>
  );
}
