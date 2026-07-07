import type { CSSProperties } from "react";
import type { CosmeticId } from "./progression-types";

export interface ColorThemeDefinition {
  name: string;
  primary: string;
  accent: string;
  description: string;
}

/** Portal color themes — one primary + accent from the user palette per unlock. */
export const COLOR_THEMES: Partial<Record<CosmeticId, ColorThemeDefinition>> = {
  "theme-dusk": {
    name: "Haze",
    primary: "#8886AE",
    accent: "#c8ebfb",
    description: "Muted violet haze with ice-blue drift",
  },
  "theme-ocean": {
    name: "Pacific",
    primary: "#006CCC",
    accent: "#1607A0",
    description: "Deep ocean blue colliding with royal navy",
  },
  "theme-sunset": {
    name: "Amber",
    primary: "#EA871E",
    accent: "#ffecb3",
    description: "Burnt amber glow over warm cream",
  },
  "theme-royal": {
    name: "Royal",
    primary: "#1607A0",
    accent: "#E22ECE",
    description: "Regal indigo punched with electric magenta",
  },
  "theme-neon": {
    name: "Voltage",
    primary: "#38FF00",
    accent: "#ECFF08",
    description: "Neon lime and citron — full send",
  },
  "theme-obsidian": {
    name: "Burgundy",
    primary: "#4d192b",
    accent: "#FF0004",
    description: "Dark wine depth with a red-hot edge",
  },
  "theme-emerald": {
    name: "Mint",
    primary: "#D5FFEA",
    accent: "#b3e5d8",
    description: "Soft mint wash for gold-tier closers",
  },
  "theme-executive-suite": {
    name: "Champagne",
    primary: "#ffecb3",
    accent: "#EA871E",
    description: "Elite cream gold — celebration mode",
  },
  "theme-black-tie": {
    name: "Void",
    primary: "#000000",
    accent: "#8886AE",
    description: "Pure black with a spectral violet rim",
  },
  "theme-platinum-lounge": {
    name: "Glacier",
    primary: "#c8ebfb",
    accent: "#006CCC",
    description: "Icy sky blue over deep pacific",
  },
  "theme-penthouse": {
    name: "Pulse",
    primary: "#E22ECE",
    accent: "#1607A0",
    description: "Hot magenta pulse on royal blue",
  },
  "theme-corner-office": {
    name: "Signal",
    primary: "#FF0004",
    accent: "#ECFF08",
    description: "Alert red with a citron strike",
  },
};

const THEME_CLASS: Partial<Record<CosmeticId, string>> = {
  "theme-dusk": "cosmetic-theme-dusk",
  "theme-ocean": "cosmetic-theme-ocean",
  "theme-sunset": "cosmetic-theme-sunset",
  "theme-royal": "cosmetic-theme-royal",
  "theme-neon": "cosmetic-theme-neon",
  "theme-obsidian": "cosmetic-theme-obsidian",
  "theme-emerald": "cosmetic-theme-emerald",
  "theme-executive-suite": "cosmetic-theme-executive-suite",
  "theme-black-tie": "cosmetic-theme-black-tie",
  "theme-platinum-lounge": "cosmetic-theme-platinum-lounge",
  "theme-penthouse": "cosmetic-theme-penthouse",
  "theme-corner-office": "cosmetic-theme-corner-office",
};

export function pageThemeClass(themeId: CosmeticId | undefined): string {
  if (!themeId || themeId === "theme-default") {
    return "app-page-theme-default";
  }
  return THEME_CLASS[themeId] ?? "";
}

export function themePreviewStyle(themeId: CosmeticId): CSSProperties | undefined {
  const theme = COLOR_THEMES[themeId];
  if (!theme) return undefined;

  return {
    backgroundColor: "#141b26",
    backgroundImage: `
      linear-gradient(135deg, ${hexAlpha(theme.primary, 0.75)} 0%, transparent 55%),
      linear-gradient(315deg, ${hexAlpha(theme.accent, 0.65)} 0%, transparent 50%)
    `,
  };
}

function hexAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getColorThemeDefinition(themeId: CosmeticId): ColorThemeDefinition | undefined {
  return COLOR_THEMES[themeId];
}
