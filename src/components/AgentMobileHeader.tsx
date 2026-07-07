"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/components/CosmeticsPanel";
import { DEFAULT_PROFILE_PICTURE } from "@/lib/avatar";
import { useSessionUser } from "@/hooks/useSessionUser";
import type { EquippedCosmetics, ProfilePicture } from "@/lib/progression-types";

const titles: Record<string, string> = {
  "/": "Practice",
  "/coach": "Coach",
  "/wiki": "EB Wiki",
  "/progress": "My Progress",
  "/leaderboard": "Leaderboard",
  "/profile": "Profile",
};

const DEFAULT_EQUIPPED: EquippedCosmetics = {
  avatarBorder: "border-starter",
  badge: "badge-none",
  theme: "theme-default",
};

export function AgentMobileHeader() {
  const pathname = usePathname();
  const user = useSessionUser();
  const title = titles[pathname] ?? "Practice";
  const [equipped, setEquipped] = useState<EquippedCosmetics>(DEFAULT_EQUIPPED);
  const [profilePicture, setProfilePicture] = useState<ProfilePicture>(DEFAULT_PROFILE_PICTURE);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile/agent");
        const data = await response.json();
        if (response.ok && data.progression) {
          setEquipped(data.progression.equippedCosmetics ?? DEFAULT_EQUIPPED);
          setProfilePicture(data.progression.profilePicture ?? DEFAULT_PROFILE_PICTURE);
        }
      } catch {
        // optional
      }
    }

    void loadProfile();

    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<{
        equipped?: EquippedCosmetics;
        equippedCosmetics?: EquippedCosmetics;
        profilePicture?: ProfilePicture;
      }>).detail;
      if (!detail) return;

      setEquipped(detail.equipped ?? detail.equippedCosmetics ?? DEFAULT_EQUIPPED);
      setProfilePicture(detail.profilePicture ?? DEFAULT_PROFILE_PICTURE);
    }

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, []);

  return (
    <header className="glass-panel sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 md:hidden">
      <img
        src="/logo.png"
        alt="EverythingBreaks"
        className="h-7 w-auto max-w-[7.5rem] object-contain"
      />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{title}</p>
          {user && pathname !== "/profile" && (
            <p className="text-xs text-slate-500">Hi, {user.name.split(" ")[0]}</p>
          )}
        </div>
        {user && (
          <Link
            href="/profile"
            className={`rounded-full transition ${
              pathname === "/profile" ? "ring-2 ring-blue-500/50" : "hover:opacity-90"
            }`}
            aria-label="Your profile"
          >
            <AgentAvatar
              name={user.name}
              equipped={equipped}
              profilePicture={profilePicture}
              size="sm"
              showBadge={false}
            />
          </Link>
        )}
      </div>
    </header>
  );
}
