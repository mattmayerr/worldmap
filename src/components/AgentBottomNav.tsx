"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBook, IconChart, IconPhone, IconSparkles, IconTrophy } from "@/components/ui/Icons";

const links = [
  { href: "/", label: "Practice", Icon: IconPhone },
  { href: "/coach", label: "Coach", Icon: IconSparkles },
  { href: "/wiki", label: "Wiki", Icon: IconBook },
  { href: "/progress", label: "Progress", Icon: IconChart },
  { href: "/leaderboard", label: "Ranks", Icon: IconTrophy },
] as const;

export function AgentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
      <div className="glass-panel mx-auto flex max-w-lg rounded-2xl p-1.5 shadow-dock">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 transition-all duration-200 ${
                active ? "nav-pill-active" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="nav-icon-glow inline-flex">
                <link.Icon className={`h-5 w-5 ${active ? "text-blue-400" : ""}`} />
              </span>
              <span className={`text-[10px] font-medium ${active ? "text-white" : ""}`}>
                {link.label}
              </span>
              {active && (
                <span className="absolute -bottom-0.5 h-0.5 w-8 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
