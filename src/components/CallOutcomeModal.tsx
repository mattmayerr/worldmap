"use client";

interface CallOutcomeModalProps {
  saving?: boolean;
  onNewCall: () => void;
  onFinish?: () => void;
}

export function CallOutcomeModal({
  saving = false,
  onNewCall,
  onFinish,
}: CallOutcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md animate-slide-up rounded-3xl bg-gradient-to-b from-red-950/40 to-surface-raised p-8 shadow-2xl ring-1 ring-red-500/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-outcome-title"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-3xl">
          ✕
        </div>

        <h2
          id="call-outcome-title"
          className="mt-5 text-center text-2xl font-bold tracking-tight text-white"
        >
          Customer hung up
        </h2>

        <p className="mt-3 text-center text-sm leading-relaxed text-slate-300">
          The call is over. Review your rebuttal, AIOA scores, and what to do differently next time.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {onFinish && (
            <button
              type="button"
              onClick={onFinish}
              disabled={saving}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? "Preparing your review..." : "See how I did"}
            </button>
          )}
          <button
            type="button"
            onClick={onNewCall}
            disabled={saving}
            className="btn-secondary w-full disabled:opacity-50"
          >
            Start new practice call
          </button>
        </div>
      </div>
    </div>
  );
}
