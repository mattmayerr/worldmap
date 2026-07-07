"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/components/CosmeticsPanel";
import { IconBook, IconChart, IconLogout, IconPhone, IconSparkles, IconTrophy } from "@/components/ui/Icons";
import { DEFAULT_PROFILE_PICTURE } from "@/lib/avatar";
import { isAgentUser, useSessionUser } from "@/hooks/useSessionUser";
import type { EquippedCosmetics, ProfilePicture } from "@/lib/progression-types";

const agentLinks = [
  { href: "/", label: "Practice", Icon: IconPhone },
  { href: "/coach", label: "Coach", Icon: IconSparkles },
  { href: "/wiki", label: "EB Wiki", Icon: IconBook },
  { href: "/progress", label: "My Progress", Icon: IconChart },
  { href: "/leaderboard", label: "Leaderboard", Icon: IconTrophy },
] as const;

const adminAgentLinks = [
  { href: "/", label: "Chat", description: "Practice, coach & knowledge" },
  { href: "/leaderboard", label: "Leaderboard", description: "Team levels & skill ranks" },
  { href: "/objections", label: "Objections", description: "B2C library & drill" },
  { href: "/history", label: "History", description: "Saved practice sessions" },
  { href: "/stats", label: "My progress", description: "Personal stats & feedback" },
] as const;

const adminLinks = [
  { href: "/documents", label: "Documents", description: "PDF, CSV & more" },
  { href: "/settings", label: "Business", description: "Tailor your agent" },
];

interface ProfileState {
  equipped: EquippedCosmetics;
  profilePicture: ProfilePicture;
}

const DEFAULT_EQUIPPED: EquippedCosmetics = {
  avatarBorder: "border-starter",
  badge: "badge-none",
  theme: "theme-default",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionUser();
  const agentView = isAgentUser(user);
  const [profileState, setProfileState] = useState<ProfileState>({
    equipped: DEFAULT_EQUIPPED,
    profilePicture: DEFAULT_PROFILE_PICTURE,
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile/agent");
        const data = await response.json();
        if (response.ok && data.progression) {
          setProfileState({
            equipped: data.progression.equippedCosmetics ?? DEFAULT_EQUIPPED,
            profilePicture: data.progression.profilePicture ?? DEFAULT_PROFILE_PICTURE,
          });
        }
      } catch {
        // Profile styling is optional for sidebar display.
      }
    }

    void loadProfile();

    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<
        Partial<ProfileState> & { equippedCosmetics?: EquippedCosmetics }
      >).detail;
      if (!detail) return;

      setProfileState({
        equipped: detail.equipped ?? detail.equippedCosmetics ?? DEFAULT_EQUIPPED,
        profilePicture: detail.profilePicture ?? DEFAULT_PROFILE_PICTURE,
      });
    }

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navLinks = agentView ? agentLinks : adminAgentLinks;
  const profileActive = pathname === "/profile";

  return (
    <aside className="glass-panel hidden w-[17rem] shrink-0 flex-col md:flex">
      <div className="border-b border-white/[0.06] p-6">
        <img
          src="/logo.png"
          alt="EverythingBreaks"
          className="h-9 w-auto max-w-[9.5rem] object-contain object-left"
        />
        {!agentView && (
          <p className="mt-3 text-xs text-slate-500">Sales training portal</p>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-4">
        {agentView
          ? agentLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-blue-500/20 to-violet-500/10 text-white ring-1 ring-blue-500/30"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span
                    className={`nav-icon-glow flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-white/[0.04] text-slate-500 group-hover:text-slate-300"
                    }`}
                  >
                    <link.Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })
          : navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-4 py-3 transition-colors ${
                    active
                      ? "bg-blue-500/15 text-white ring-1 ring-blue-500/30"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <div className="text-sm font-medium">{link.label}</div>
                  {"description" in link && link.description ? (
                    <div className="text-xs text-slate-500">{link.description}</div>
                  ) : null}
                </Link>
              );
            })}

        {!agentView &&
          adminLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-3 transition-colors ${
                  active
                    ? "bg-blue-500/15 text-white ring-1 ring-blue-500/30"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className="text-sm font-medium">{link.label}</div>
                <div className="text-xs text-slate-500">{link.description}</div>
              </Link>
            );
          })}

        {!agentView && (
          <Link
            href="/admin"
            className={`rounded-xl px-4 py-3 transition-colors ${
              pathname === "/admin"
                ? "bg-violet-500/15 text-white ring-1 ring-violet-500/30"
                : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <div className="text-sm font-medium">Admin</div>
            <div className="text-xs text-slate-500">Team metrics & accounts</div>
          </Link>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        {user ? (
          <div className="space-y-3">
            <Link
              href="/profile"
              className={`flex items-center gap-3 rounded-xl px-1 py-1 transition ${
                profileActive
                  ? "bg-white/[0.06] ring-1 ring-blue-500/30"
                  : "hover:bg-white/[0.04]"
              }`}
            >
              <AgentAvatar
                name={user.name}
                equipped={profileState.equipped}
                profilePicture={profileState.profilePicture}
                size="sm"
                showBadge={false}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name.split(" ")[0]}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <p className="mt-0.5 text-[10px] font-medium text-blue-400/90">Edit profile →</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="btn-secondary flex w-full items-center justify-center gap-2"
            >
              <IconLogout className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
