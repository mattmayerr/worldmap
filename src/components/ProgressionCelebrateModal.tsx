"use client";

import type { ProgressionMilestone, SkillTier } from "@/lib/progression-types";
import { SKILL_TIER_LABELS, skillTierBadgeClass } from "@/lib/progression-utils";

interface ProgressionCelebrateModalProps {
  milestones: ProgressionMilestone[];
  level: number;
  skillTier: SkillTier;
  skillTierLabel: string;
  xpGained: number;
  onClose: () => void;
}

const GRAFFITI_TAGS = [
  { text: "LEVEL UP", top: "6%", left: "4%", rotate: -14, color: "#ff2d92", size: "clamp(2.5rem, 8vw, 4.5rem)" },
  { text: "RANK UP", top: "12%", left: "58%", rotate: 10, color: "#ffe600", size: "clamp(2rem, 7vw, 3.75rem)" },
  { text: "XP", top: "68%", left: "8%", rotate: 8, color: "#00f0ff", size: "clamp(3rem, 10vw, 5rem)" },
  { text: "GRIND", top: "72%", left: "52%", rotate: -8, color: "#7cff00", size: "clamp(2.25rem, 7vw, 4rem)" },
  { text: "SALE", top: "38%", left: "-2%", rotate: -22, color: "#ff6b00", size: "clamp(2rem, 6vw, 3.5rem)" },
  { text: "WIN", top: "42%", left: "72%", rotate: 16, color: "#b026ff", size: "clamp(2.5rem, 8vw, 4.25rem)" },
] as const;

function GraffitiBackdrop({ highlight }: { highlight: "level" | "rank" | "both" }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%),
            linear-gradient(225deg, rgba(255,255,255,0.03) 25%, transparent 25%),
            linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%),
            linear-gradient(315deg, rgba(255,255,255,0.03) 25%, transparent 25%)
          `,
          backgroundSize: "28px 28px",
          backgroundColor: "#141b26",
        }}
      />

      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        <circle cx="60" cy="80" r="48" fill="#ff2d92" opacity="0.35" />
        <circle cx="340" cy="120" r="56" fill="#ffe600" opacity="0.28" />
        <circle cx="320" cy="320" r="64" fill="#00f0ff" opacity="0.22" />
        <circle cx="90" cy="300" r="52" fill="#7cff00" opacity="0.25" />
        <ellipse cx="200" cy="200" rx="90" ry="40" fill="#b026ff" opacity="0.18" transform="rotate(-20 200 200)" />
      </svg>

      {GRAFFITI_TAGS.map((tag) => (
        <span
          key={tag.text}
          className="absolute select-none font-black uppercase leading-none tracking-tighter"
          style={{
            top: tag.top,
            left: tag.left,
            transform: `rotate(${tag.rotate}deg)`,
            fontSize: tag.size,
            color: tag.color,
            opacity: 0.22,
            WebkitTextStroke: "2px rgba(0,0,0,0.5)",
            textShadow: `4px 4px 0 rgba(0,0,0,0.45), 0 0 40px ${tag.color}55`,
          }}
        >
          {tag.text}
        </span>
      ))}

      {(highlight === "level" || highlight === "both") && (
        <span
          className="absolute left-1/2 top-[18%] -translate-x-1/2 select-none font-black uppercase text-[#ff2d92]"
          style={{
            fontSize: "clamp(3.5rem, 14vw, 7rem)",
            transform: "translateX(-50%) rotate(-6deg)",
            opacity: 0.12,
            WebkitTextStroke: "3px rgba(0,0,0,0.6)",
          }}
        >
          LEVEL UP
        </span>
      )}

      {(highlight === "rank" || highlight === "both") && (
        <span
          className="absolute bottom-[16%] left-1/2 -translate-x-1/2 select-none font-black uppercase text-[#ffe600]"
          style={{
            fontSize: "clamp(3rem, 12vw, 6rem)",
            transform: "translateX(-50%) rotate(5deg)",
            opacity: 0.12,
            WebkitTextStroke: "3px rgba(0,0,0,0.6)",
          }}
        >
          RANK UP
        </span>
      )}
    </div>
  );
}

function milestoneHeadline(milestones: ProgressionMilestone[]): string {
  const hasLevel = milestones.some((item) => item.type === "level");
  const hasRank = milestones.some((item) => item.type === "rank");
  if (hasLevel && hasRank) return "Double promotion!";
  if (hasRank) return "Rank up!";
  return "Level up!";
}

export function ProgressionCelebrateModal({
  milestones,
  level,
  skillTier,
  skillTierLabel,
  xpGained,
  onClose,
}: ProgressionCelebrateModalProps) {
  const hasLevel = milestones.some((item) => item.type === "level");
  const hasRank = milestones.some((item) => item.type === "rank");
  const highlight = hasLevel && hasRank ? "both" : hasRank ? "rank" : "level";

  const levelMilestone = milestones.find((item) => item.type === "level");
  const rankMilestone = milestones.find((item) => item.type === "rank");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="relative h-full max-h-[92vh] w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
        <GraffitiBackdrop highlight={highlight} />

        <div className="relative flex h-full flex-col bg-gradient-to-b from-black/55 via-black/70 to-black/85 backdrop-blur-[2px]">
          <div className="flex-1 overflow-y-auto px-6 py-10 sm:px-8">
            <div className="animate-celebrate-pop mx-auto max-w-sm text-center">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-fuchsia-300/90">
                Congratulations
              </p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white drop-shadow-lg sm:text-5xl">
                {milestoneHeadline(milestones)}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                {hasLevel && hasRank
                  ? "Your practice paid off — you leveled up and earned a new skill rank."
                  : hasRank
                    ? "Your call quality unlocked a new skill rank. Keep closing on the same call."
                    : "You earned enough XP to reach the next level. Keep grinding."}
              </p>

              <div className="mt-8 space-y-4">
                {levelMilestone && (
                  <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-5 py-4 ring-1 ring-fuchsia-500/20">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-300">
                      Experience level
                    </p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-white">
                      Level {levelMilestone.newLevel}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Up from level {levelMilestone.previousLevel}
                      {xpGained > 0 && (
                        <span className="text-blue-300"> · +{xpGained} XP this call</span>
                      )}
                    </p>
                  </div>
                )}

                {rankMilestone && rankMilestone.newTier && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 ring-1 ring-amber-500/20">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                      Skill rank
                    </p>
                    <p className="mt-2">
                      <span
                        className={`inline-block rounded-full border px-4 py-1.5 text-lg font-bold ${skillTierBadgeClass(rankMilestone.newTier)}`}
                      >
                        {SKILL_TIER_LABELS[rankMilestone.newTier]}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {rankMilestone.previousTier === "calibrating"
                        ? "Your rank is now unlocked"
                        : `Promoted from ${SKILL_TIER_LABELS[rankMilestone.previousTier ?? "calibrating"]}`}
                      {typeof rankMilestone.skillRating === "number" && (
                        <span className="text-slate-300"> · {rankMilestone.skillRating}/100 rating</span>
                      )}
                    </p>
                  </div>
                )}

                {!levelMilestone && !rankMilestone && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <p className="text-sm text-slate-300">
                      Level {level} · {skillTierLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-black/40 px-6 py-5 sm:px-8">
            <button type="button" onClick={onClose} className="btn-primary w-full !py-3.5 !text-base">
              Let&apos;s go
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
