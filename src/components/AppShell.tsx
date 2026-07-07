"use client";

import { usePathname } from "next/navigation";
import { AgentBottomNav } from "@/components/AgentBottomNav";
import { AgentMobileHeader } from "@/components/AgentMobileHeader";
import { Sidebar } from "@/components/Sidebar";
import { useEquippedTheme } from "@/hooks/useEquippedTheme";
import { isAgentUser, useSessionUser } from "@/hooks/useSessionUser";
import { pageThemeAnimationClass, pageThemeClass } from "@/lib/cosmetics";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useSessionUser();
  const theme = useEquippedTheme();
  const isLogin = pathname === "/login";
  const agentView = isAgentUser(user);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div
      className={`app-page-theme flex h-screen overflow-hidden ${pageThemeClass(theme)} ${pageThemeAnimationClass(theme)}`}
    >
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {agentView && <AgentMobileHeader />}
        <main
          className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
            agentView ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0" : ""
          }`}
        >
          {children}
        </main>
      </div>
      {agentView && <AgentBottomNav />}
    </div>
  );
}
