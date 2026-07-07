"use client";

import {
  avatarBorderAnimationClass,
  avatarBorderClass,
  avatarBorderFlowStyle,
  avatarBorderUsesFlowRing,
  badgeAnimationClass,
  badgeClass,
  badgeLabel,
  getNextLevelUnlocks,
  isCosmeticEquipped,
  type CosmeticCategory,
  type CosmeticItemState,
} from "@/lib/cosmetics";
import { themePreviewStyle } from "@/lib/color-themes";
import { avatarImageUrl, presetGradient } from "@/lib/avatar";
import type {
  CosmeticId,
  EquippedCosmetics,
  ProfilePicture,
} from "@/lib/progression-types";

interface AgentAvatarProps {
  name: string;
  equipped: EquippedCosmetics;
  profilePicture?: ProfilePicture;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

const SIZE_CLASS = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
} as const;

export function AgentAvatar({
  name,
  equipped,
  profilePicture,
  size = "sm",
  showBadge = true,
}: AgentAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const safeEquipped: EquippedCosmetics = {
    avatarBorder: equipped?.avatarBorder ?? "border-starter",
    badge: equipped?.badge ?? "badge-none",
    theme: equipped?.theme ?? "theme-default",
  };
  const badge = badgeLabel(safeEquipped.badge);
  const badgeStyles = badgeClass(safeEquipped.badge);
  const picture = profilePicture ?? { type: "initial" as const };
  const uploadUrl = avatarImageUrl(picture);
  const gradient =
    picture.type === "preset"
      ? presetGradient(picture.presetId)
      : "from-blue-500 to-violet-600";

  const flowRing = avatarBorderUsesFlowRing(safeEquipped.avatarBorder);
  const flowRingClass = avatarBorderAnimationClass(safeEquipped.avatarBorder);
  const flowRingStyle = avatarBorderFlowStyle(safeEquipped.avatarBorder);

  const avatarContent = uploadUrl ? (
    <img
      src={uploadUrl}
      alt=""
      className="h-full w-full rounded-full object-cover"
    />
  ) : (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${gradient}`}
    >
      {initial}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {flowRing ? (
        <div
          className={`avatar-ring-flow relative rounded-full ${SIZE_CLASS[size]} ${flowRingClass}`}
          style={flowRingStyle}
        >
          <div className="avatar-ring-flow__inner h-full w-full rounded-full bg-surface">
            {avatarContent}
          </div>
        </div>
      ) : (
        <div
          className={`rounded-full ${SIZE_CLASS[size]} ${avatarBorderClass(safeEquipped.avatarBorder)}`}
        >
          {avatarContent}
        </div>
      )}
      {showBadge && badge && badgeStyles ? (
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeStyles} ${badgeAnimationClass(safeEquipped.badge)}`}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

interface CosmeticsPanelProps {
  name: string;
  cosmetics: CosmeticItemState[];
  equipped: EquippedCosmetics;
  profilePicture: ProfilePicture;
  currentLevel: number;
  currentPrestigeCount: number;
  saving: boolean;
  onEquip: (category: CosmeticCategory, id: CosmeticId) => void;
}

const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  border: "Avatar rings",
  badge: "Badges",
  theme: "Color themes",
};

function LockedCosmeticCard({ item }: { item: CosmeticItemState }) {
  const isLevelUnlock = item.unlock.type === "level";
  const isPrestigeUnlock = item.unlock.type === "prestige";
  const elite = item.prestige === true;
  const rugged = item.prestigeReward === true;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-dashed px-3 py-3 ${
        rugged
          ? "border-stone-600/40 bg-gradient-to-br from-stone-800/30 to-stone-900/10"
          : elite
            ? "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-violet-500/[0.04]"
            : "border-white/[0.1] bg-white/[0.02]"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: rugged
            ? "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(120,113,108,0.25) 10px, rgba(120,113,108,0.25) 20px)"
            : elite
              ? "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(251,191,36,0.2) 10px, rgba(251,191,36,0.2) 20px)"
              : "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 16px)",
        }}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${
            rugged
              ? "bg-stone-800/50 ring-stone-600/40 text-stone-400"
              : elite
                ? "bg-amber-500/10 ring-amber-400/30 text-amber-200"
                : "bg-white/[0.04] ring-white/[0.08] text-slate-600"
          }`}
        >
          <span className="text-lg font-bold">{rugged ? "⚒" : elite ? "★" : "?"}</span>
        </div>
        <div className="min-w-0">
          {rugged ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Tour reward
            </p>
          ) : elite ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
              Elite unlock
            </p>
          ) : (
            <p className="text-sm font-medium text-slate-500">Mystery reward</p>
          )}
          <p
            className={`mt-0.5 text-xs font-semibold ${
              rugged ? "text-stone-300/95" : elite ? "text-amber-200/95" : "text-amber-300/95"
            }`}
          >
            {item.unlockLabel}
          </p>
          {isLevelUnlock && item.levelsAway !== null && item.levelsAway > 0 ? (
            <p className="mt-1 text-[10px] text-slate-500">
              {item.levelsAway} level{item.levelsAway === 1 ? "" : "s"} to go
            </p>
          ) : null}
          {isPrestigeUnlock && item.prestigesAway !== null && item.prestigesAway > 0 ? (
            <p className="mt-1 text-[10px] text-stone-500">
              {item.prestigesAway} prestige{item.prestigesAway === 1 ? "" : "s"} to go
            </p>
          ) : null}
          {!isLevelUnlock && !isPrestigeUnlock ? (
            <p className="mt-1 text-[10px] text-slate-600">
              {elite ? "Earn elite status to reveal it" : "Keep practicing to reveal it"}
            </p>
          ) : isPrestigeUnlock ? (
            <p className="mt-1 text-[10px] text-stone-600">Only earned by prestiging at max level</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CosmeticsPanel({
  name,
  cosmetics,
  equipped,
  profilePicture,
  currentLevel,
  saving,
  onEquip,
}: CosmeticsPanelProps) {
  const categories: CosmeticCategory[] = ["border", "badge", "theme"];
  const nextUnlocks = getNextLevelUnlocks(cosmetics, currentLevel);
  const nextLevel =
    nextUnlocks[0]?.unlock.type === "level" ? nextUnlocks[0].unlock.level : null;

  return (
    <div className="glass-card space-y-5 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Rewards</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Your cosmetics</h2>
        <p className="mt-1 text-sm text-slate-400">
          Level up to reveal rings, badges, and themes. Prestige at level 20 to earn rugged tour
          rewards — badges and rings nobody else can get without resetting.
        </p>
      </div>

      {nextLevel !== null && nextUnlocks.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">
            Next unlock
          </p>
          <p className="mt-1 text-sm text-amber-50/95">
            Reach <span className="font-bold">Level {nextLevel}</span> to unlock{" "}
            <span className="font-bold">{nextUnlocks.length}</span> mystery reward
            {nextUnlocks.length === 1 ? "" : "s"}.
          </p>
          {currentLevel < nextLevel && (
            <p className="mt-1 text-xs text-amber-200/70">
              {nextLevel - currentLevel} level{nextLevel - currentLevel === 1 ? "" : "s"} away at
              your current pace.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-center py-2">
        <AgentAvatar
          name={name}
          equipped={equipped}
          profilePicture={profilePicture}
          size="lg"
          showBadge
        />
      </div>

      {categories.map((category) => {
        const items = cosmetics.filter((item) => item.category === category);
        const unlockedCount = items.filter((item) => item.unlocked).length;

        return (
          <div key={category}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {CATEGORY_LABELS[category]}
              </p>
              <p className="text-[10px] text-slate-600">
                {unlockedCount}/{items.length} unlocked
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => {
                const rugged = item.prestigeReward === true;
                const elite = item.prestige === true;
                const equippedNow = isCosmeticEquipped(item, equipped);

                return !item.unlocked ? (
                  <LockedCosmeticCard key={item.id} item={item} />
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    disabled={saving || equippedNow}
                    onClick={() => onEquip(category, item.id)}
                    className={`rounded-xl border px-3 py-3 text-left transition disabled:cursor-not-allowed ${
                      equippedNow
                        ? rugged
                          ? "border-stone-500/50 bg-stone-800/40 ring-1 ring-stone-500/40"
                          : elite
                            ? "border-amber-400/50 bg-gradient-to-br from-amber-500/15 to-violet-500/10 ring-1 ring-amber-400/40"
                            : "border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/30"
                        : rugged
                          ? "border-stone-600/30 bg-stone-900/20 hover:border-stone-500/45 hover:bg-stone-800/30"
                          : elite
                            ? "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] to-white/[0.02] hover:border-amber-400/40 hover:from-amber-500/10"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {rugged ? (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Tour reward
                          </p>
                        ) : elite ? (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                            Elite
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-sm font-medium text-white">{item.name}</p>
                      </div>
                      {equippedNow ? (
                        <span
                          className={`shrink-0 text-[10px] font-semibold uppercase ${
                            rugged ? "text-stone-300" : elite ? "text-amber-200" : "text-blue-300"
                          }`}
                        >
                          Equipped
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-semibold uppercase text-emerald-300">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        rugged ? "text-stone-400" : elite ? "text-amber-100/70" : "text-slate-400"
                      }`}
                    >
                      {item.description}
                    </p>
                    {category === "theme" && item.id !== "theme-default" ? (
                      <div
                        className="mt-2 h-10 w-full rounded-lg border border-white/10"
                        style={themePreviewStyle(item.id)}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
