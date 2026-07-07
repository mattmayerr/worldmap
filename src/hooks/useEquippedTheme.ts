"use client";

import { useEffect, useState } from "react";
import type { CosmeticId, EquippedCosmetics } from "@/lib/progression-types";

const DEFAULT_THEME: CosmeticId = "theme-default";

export function useEquippedTheme(): CosmeticId {
  const [theme, setTheme] = useState<CosmeticId>(DEFAULT_THEME);

  useEffect(() => {
    async function loadTheme() {
      try {
        const response = await fetch("/api/profile/agent");
        const data = await response.json();
        if (response.ok && data.progression?.equippedCosmetics?.theme) {
          setTheme(data.progression.equippedCosmetics.theme);
        }
      } catch {
        // Theme styling is optional.
      }
    }

    void loadTheme();

    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<{
        equipped?: EquippedCosmetics;
        equippedCosmetics?: EquippedCosmetics;
      }>).detail;
      if (!detail) return;

      const equipped = detail.equipped ?? detail.equippedCosmetics;
      if (equipped?.theme) {
        setTheme(equipped.theme);
      }
    }

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, []);

  return theme;
}
