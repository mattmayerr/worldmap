"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";

export interface SessionUser {
  name: string;
  email: string;
  role: UserRole;
}

export function useSessionUser(): SessionUser | null {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.user) setUser(data.user);
      } catch {
        // ignore
      }
    }

    void load();
  }, []);

  return user;
}

export function isAgentUser(user: SessionUser | null): boolean {
  return user?.role === "agent";
}
