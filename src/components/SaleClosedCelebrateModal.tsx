"use client";

import { useEffect, useRef } from "react";
import type { AioaEvaluation } from "@/lib/types";

const CONFETTI_COLORS = ["#ff2d92", "#ffe600", "#00f0ff", "#7cff00", "#ff6b00", "#b026ff", "#34d399"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  spin: number;
}

function spawnConfetti(width: number, height: number, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.3,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 5,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 12,
  }));
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let particles = spawnConfetti(window.innerWidth, window.innerHeight, 120);
    const startedAt = Date.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.08;
        particle.rotation += particle.spin;

        context.save();
        context.translate(particle.x, particle.y);
        context.rotate((particle.rotation * Math.PI) / 180);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
        context.restore();
      }

      particles = particles.filter((particle) => particle.y < canvas.height + 40);

      if (Date.now() - startedAt < 4500 && particles.length < 40) {
        particles.push(...spawnConfetti(canvas.width, canvas.height, 8));
      }

      if (particles.length > 0 || Date.now() - startedAt < 4500) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden
    />
  );
}

interface SaleClosedCelebrateModalProps {
  feedback: string;
  aioa?: AioaEvaluation | null;
  onContinue: () => void;
  onFinish?: () => void;
  onNewCall: () => void;
}

export function SaleClosedCelebrateModal({
  feedback,
  aioa,
  onContinue,
  onFinish,
  onNewCall,
}: SaleClosedCelebrateModalProps) {
  return (
    <>
      <ConfettiCanvas />
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <div
          className="relative w-full max-w-md animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-950/95 via-surface-raised to-surface-raised p-8 shadow-2xl ring-1 ring-emerald-400/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-closed-title"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-yellow-400/15 blur-3xl"
            aria-hidden
          />

          <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
            Same-day close
          </p>

          <h2
            id="sale-closed-title"
            className="mt-3 text-center text-3xl font-black leading-tight tracking-tight text-white"
          >
            BOOM — you just sold some coverage!
          </h2>

          {aioa && (
            <p className="mt-3 text-center text-sm text-emerald-200/90">
              AIOA average{" "}
              <span className="font-bold tabular-nums text-white">{aioa.overallScore}/10</span> — they
              bought it.
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
              What you did right
            </p>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50/95">{feedback}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button type="button" onClick={onContinue} className="btn-primary w-full">
              Continue wrapping up the sale
            </button>
            {onFinish && (
              <button type="button" onClick={onFinish} className="btn-secondary w-full">
                Finish & see how I did
              </button>
            )}
            <button
              type="button"
              onClick={onNewCall}
              className="w-full py-2 text-sm text-slate-500 transition hover:text-slate-300"
            >
              Start a new call
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
