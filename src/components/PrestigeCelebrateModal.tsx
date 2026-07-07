"use client";

import type { CosmeticDefinition } from "@/lib/cosmetics";
import { prestigeLabel } from "@/lib/progression-utils";

interface PrestigeCelebrateModalProps {
  prestigeCount: number;
  unlockedDetails: CosmeticDefinition[];
  onClose: () => void;
}

export function PrestigeCelebrateModal({
  prestigeCount,
  unlockedDetails,
  onClose,
}: PrestigeCelebrateModalProps) {
  const badge = unlockedDetails.find((item) => item.category === "badge");
  const border = unlockedDetails.find((item) => item.category === "border");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl ring-1 ring-stone-600/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(120,113,108,0.35) 12px, rgba(120,113,108,0.35) 24px)",
          }}
          aria-hidden
        />
        <div className="relative bg-gradient-to-b from-stone-900 via-[#141b26] to-black px-6 py-10 sm:px-8">
          <div className="animate-celebrate-pop mx-auto max-w-sm text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-stone-400">
              Prestige earned
            </p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-stone-100 drop-shadow-lg sm:text-5xl">
              Tour reset
            </h2>
            <p className="mt-2 text-lg font-bold text-amber-500/90">{prestigeLabel(prestigeCount)}</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Level reset to 1 — but your skill rank stays. You earned exclusive rewards that only
              veterans who grind all the way back can wear.
            </p>

            <div className="mt-8 space-y-3 text-left">
              {badge ? (
                <div className="rounded-2xl border border-stone-600/40 bg-stone-800/30 px-5 py-4 ring-1 ring-stone-500/20">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                    Prestige badge
                  </p>
                  <p className="mt-1 text-xl font-black text-stone-100">{badge.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{badge.description}</p>
                </div>
              ) : null}
              {border ? (
                <div className="rounded-2xl border border-stone-600/40 bg-stone-800/30 px-5 py-4 ring-1 ring-stone-500/20">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                    Exclusive ring
                  </p>
                  <p className="mt-1 text-xl font-black text-stone-100">{border.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{border.description}</p>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary mt-8 w-full !border-stone-600 !bg-stone-800 !py-3.5 !text-base hover:!bg-stone-700"
          >
            Back to the grind
          </button>
        </div>
      </div>
    </div>
  );
}
