"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CosmeticsPanel } from "@/components/CosmeticsPanel";
import { AgentAvatar } from "@/components/CosmeticsPanel";
import { ProfilePicturePicker, dispatchProfileUpdated } from "@/components/ProfilePicturePicker";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  getNextLevelUnlocks,
  isCosmeticEquipped,
  type CosmeticCategory,
  type CosmeticItemState,
} from "@/lib/cosmetics";
import type {
  CosmeticId,
  EquippedCosmetics,
  ProfilePicture,
  ProgressionSummary,
} from "@/lib/progression-types";
import { skillTierBadgeClass } from "@/lib/progression-utils";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ProfilePage() {
  const sessionUser = useSessionUser();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [progression, setProgression] = useState<ProgressionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/agent", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load profile.");
      }
      setUser(data.user);
      setProgression(data.progression);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function patchProfile(body: {
    equipped?: EquippedCosmetics;
    profilePicture?: ProfilePicture;
  }) {
    setSaving(true);
    try {
      const response = await fetch("/api/profile/agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile.");
      }
      setProgression(data.progression);
      dispatchProfileUpdated({
        equippedCosmetics: data.progression.equippedCosmetics,
        profilePicture: data.progression.profilePicture,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile.";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function applyEquippedUpdate(nextEquipped: EquippedCosmetics): ProgressionSummary | null {
    if (!progression) return null;
    return {
      ...progression,
      equippedCosmetics: nextEquipped,
      cosmetics: progression.cosmetics.map((item) => ({
        ...item,
        equipped: isCosmeticEquipped(item, nextEquipped),
      })),
    };
  }

  async function equipCosmetic(category: CosmeticCategory, id: CosmeticId) {
    if (!progression) return;

    const nextEquipped = { ...progression.equippedCosmetics };
    if (category === "border") nextEquipped.avatarBorder = id;
    if (category === "badge") nextEquipped.badge = id;
    if (category === "theme") nextEquipped.theme = id;

    const optimistic = applyEquippedUpdate(nextEquipped);
    if (optimistic) {
      setProgression(optimistic);
      dispatchProfileUpdated({
        equippedCosmetics: nextEquipped,
        profilePicture: progression.profilePicture,
      });
    }

    try {
      await patchProfile({ equipped: nextEquipped });
    } catch {
      void loadProfile();
    }
  }

  async function selectProfilePicture(picture: ProfilePicture) {
    try {
      await patchProfile({ profilePicture: picture });
    } catch {
      // Error message shown via profile page state.
    }
  }

  async function uploadProfilePicture(file: File) {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload photo.");
      }

      const profileResponse = await fetch("/api/profile/agent");
      const profileData = await profileResponse.json();
      if (profileResponse.ok && profileData.progression) {
        setProgression(profileData.progression);
        dispatchProfileUpdated({
          equippedCosmetics: profileData.progression.equippedCosmetics,
          profilePicture: profileData.progression.profilePicture,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const displayName = user?.name ?? sessionUser?.name ?? "Agent";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-lg animate-slide-up space-y-5">
        <div>
          <p className="text-sm font-medium text-blue-400">Account</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gradient">Your profile</h1>
          <p className="mt-2 text-sm text-slate-400">
            Customize how you look in the portal — photo, rings, badges, and themes.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {progression && user && (
          <>
            <div className="glass-card flex items-center gap-4 p-5">
              <AgentAvatar
                name={displayName}
                equipped={progression.equippedCosmetics}
                profilePicture={progression.profilePicture}
                size="md"
                showBadge
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-white">{displayName}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-slate-300">
                    Level {progression.level}
                    {progression.level >= progression.maxLevel ? " · MAX" : ""}
                  </span>
                  {progression.prestigeCount > 0 ? (
                    <span className="rounded-full border border-stone-600/40 bg-stone-800/40 px-2.5 py-0.5 text-xs font-semibold text-stone-300">
                      {progression.prestigeLabel}
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${skillTierBadgeClass(progression.skillTier)}`}
                  >
                    {progression.skillTierLabel}
                  </span>
                </div>
              </div>
            </div>

            <ProfilePicturePicker
              name={displayName}
              profilePicture={progression.profilePicture}
              equipped={progression.equippedCosmetics}
              saving={saving}
              onSelect={(picture) => void selectProfilePicture(picture)}
              onUpload={uploadProfilePicture}
            />

            {progression.cosmetics.length > 0 && (
              <CosmeticsPanel
                name={displayName}
                cosmetics={progression.cosmetics}
                equipped={progression.equippedCosmetics}
                profilePicture={progression.profilePicture}
                currentLevel={progression.level}
                currentPrestigeCount={progression.prestigeCount}
                saving={saving}
                onEquip={(category, id) => void equipCosmetic(category, id)}
              />
            )}
          </>
        )}

        <p className="text-center text-sm text-slate-500">
          Practice stats live on{" "}
          <Link href="/progress" className="text-blue-400 hover:text-blue-300">
            My Progress
          </Link>
          . Hi, {firstName}.
        </p>
      </div>
    </div>
  );
}
