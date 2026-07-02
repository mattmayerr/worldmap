"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Chat", description: "Practice & coaching" },
  { href: "/documents", label: "Documents", description: "PDF, CSV & more" },
  { href: "/settings", label: "Business", description: "Tailor your agent" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-surface-border bg-surface-raised/80 backdrop-blur md:flex">
      <div className="border-b border-surface-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-lg">
            🎯
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Sales Agent</h1>
            <p className="text-xs text-slate-400">Practice & coaching</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-3 transition-colors ${
                active
                  ? "bg-accent/20 text-white ring-1 ring-accent/40"
                  : "text-slate-300 hover:bg-surface-border/50 hover:text-white"
              }`}
            >
              <div className="text-sm font-medium">{link.label}</div>
              <div className="text-xs text-slate-400">{link.description}</div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-border p-4 text-xs leading-relaxed text-slate-500">
        Upload business docs to tailor responses. Add your OpenAI API key in{" "}
        <code className="rounded bg-surface px-1 text-slate-300">.env.local</code>.
      </div>
    </aside>
  );
}
