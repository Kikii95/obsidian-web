"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/lib/settings-store";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type ThemeMode = "dark" | "light";

export type Theme =
  // Dark themes (ordered by hue 0→360)
  | "carmine"      // 25 (vrai rouge)
  | "crimson"      // 15
  | "peach-dark"   // 25
  | "brown"        // 30
  | "sunset"       // 35
  | "sand-dark"    // 50
  | "cyber"        // 85
  | "sage-dark"    // 140
  | "forest"       // 150
  | "mint"         // 170
  | "turquoise"    // 190
  | "cloud-dark"   // 210
  | "ocean"        // 220
  | "mist-dark"    // 230
  | "lavender"     // 280
  | "magenta"      // 320
  | "rose"         // 350
  | "mono"         // achromatic
  // Light themes (same order)
  | "carmine-light"
  | "crimson-light"
  | "peach"
  | "brown-light"
  | "sunset-light"
  | "sand"
  | "cyber-light"
  | "sage"
  | "forest-light"
  | "mint-light"
  | "turquoise-light"
  | "cloud"
  | "ocean-light"
  | "mist"
  | "lavender-light"
  | "magenta-light"
  | "rose-light"
  | "mono-light";

export interface ThemeOption {
  id: Theme;
  name: string;
  emoji: string;
  description: string;
  mode: ThemeMode;
  pair: Theme; // The opposite mode version
}

// ═══════════════════════════════════════════════
// THEME DEFINITIONS (ordered by color spectrum)
// ═══════════════════════════════════════════════

export const themes: ThemeOption[] = [
  // ─────────────────────────────────────────────
  // DARK THEMES (hue 0→360)
  // ─────────────────────────────────────────────
  // 🔴 Reds / Oranges / Browns
  { id: "carmine", name: "Carmine", emoji: "❤️", description: "Rouge carmin", mode: "dark", pair: "carmine-light" },
  { id: "crimson", name: "Crimson", emoji: "🔴", description: "Rouge intense", mode: "dark", pair: "crimson-light" },
  { id: "peach-dark", name: "Peach", emoji: "🍑", description: "Pêche doux", mode: "dark", pair: "peach" },
  { id: "brown", name: "Brown", emoji: "🟤", description: "Marron chaud", mode: "dark", pair: "brown-light" },
  { id: "sunset", name: "Sunset", emoji: "🟠", description: "Orange chaud", mode: "dark", pair: "sunset-light" },
  { id: "sand-dark", name: "Sand", emoji: "🏖️", description: "Sable chaud", mode: "dark", pair: "sand" },
  // 💛 Yellow
  { id: "cyber", name: "Cyber", emoji: "💛", description: "Jaune néon", mode: "dark", pair: "cyber-light" },
  // 🟢 Greens
  { id: "sage-dark", name: "Sage", emoji: "🧘", description: "Vert sauge", mode: "dark", pair: "sage" },
  { id: "forest", name: "Forest", emoji: "🟢", description: "Vert émeraude", mode: "dark", pair: "forest-light" },
  { id: "mint", name: "Mint", emoji: "🌿", description: "Menthe fraîche", mode: "dark", pair: "mint-light" },
  { id: "turquoise", name: "Turquoise", emoji: "🩵", description: "Cyan tropical", mode: "dark", pair: "turquoise-light" },
  // 🔵 Blues
  { id: "cloud-dark", name: "Cloud", emoji: "☁️", description: "Bleu ciel", mode: "dark", pair: "cloud" },
  { id: "ocean", name: "Ocean", emoji: "🔵", description: "Bleu profond", mode: "dark", pair: "ocean-light" },
  { id: "mist-dark", name: "Mist", emoji: "🌫️", description: "Gris bleuté", mode: "dark", pair: "mist" },
  // 🟣 Purples / Pinks
  { id: "lavender", name: "Lavender", emoji: "🟣", description: "Violet doux", mode: "dark", pair: "lavender-light" },
  { id: "magenta", name: "Magenta", emoji: "💜", description: "Violet vibrant", mode: "dark", pair: "magenta-light" },
  { id: "rose", name: "Rose", emoji: "🌸", description: "Rose pastel", mode: "dark", pair: "rose-light" },
  // ⚫ Achromatic
  { id: "mono", name: "Mono", emoji: "⚫", description: "Noir & blanc", mode: "dark", pair: "mono-light" },

  // ─────────────────────────────────────────────
  // LIGHT THEMES (same order)
  // ─────────────────────────────────────────────
  // 🔴 Reds / Oranges / Browns
  { id: "carmine-light", name: "Carmine", emoji: "❤️", description: "Rouge carmin", mode: "light", pair: "carmine" },
  { id: "crimson-light", name: "Crimson", emoji: "🔴", description: "Rouge clair", mode: "light", pair: "crimson" },
  { id: "peach", name: "Peach", emoji: "🍑", description: "Pêche doux", mode: "light", pair: "peach-dark" },
  { id: "brown-light", name: "Brown", emoji: "🟤", description: "Marron clair", mode: "light", pair: "brown" },
  { id: "sunset-light", name: "Sunset", emoji: "🟠", description: "Orange clair", mode: "light", pair: "sunset" },
  { id: "sand", name: "Sand", emoji: "🏖️", description: "Sable chaud", mode: "light", pair: "sand-dark" },
  // 💛 Yellow
  { id: "cyber-light", name: "Cyber", emoji: "💛", description: "Jaune clair", mode: "light", pair: "cyber" },
  // 🟢 Greens
  { id: "sage", name: "Sage", emoji: "🧘", description: "Vert sauge", mode: "light", pair: "sage-dark" },
  { id: "forest-light", name: "Forest", emoji: "🟢", description: "Forêt clair", mode: "light", pair: "forest" },
  { id: "mint-light", name: "Mint", emoji: "🌿", description: "Menthe clair", mode: "light", pair: "mint" },
  { id: "turquoise-light", name: "Turquoise", emoji: "🩵", description: "Turquoise clair", mode: "light", pair: "turquoise" },
  // 🔵 Blues
  { id: "cloud", name: "Cloud", emoji: "☁️", description: "Bleu ciel", mode: "light", pair: "cloud-dark" },
  { id: "ocean-light", name: "Ocean", emoji: "🔵", description: "Océan clair", mode: "light", pair: "ocean" },
  { id: "mist", name: "Mist", emoji: "🌫️", description: "Gris bleuté", mode: "light", pair: "mist-dark" },
  // 🟣 Purples / Pinks
  { id: "lavender-light", name: "Lavender", emoji: "🟣", description: "Lavande clair", mode: "light", pair: "lavender" },
  { id: "magenta-light", name: "Magenta", emoji: "💜", description: "Violet clair", mode: "light", pair: "magenta" },
  { id: "rose-light", name: "Rose", emoji: "🌸", description: "Rose clair", mode: "light", pair: "rose" },
  // ⚫ Achromatic
  { id: "mono-light", name: "Mono", emoji: "⚪", description: "Blanc & noir", mode: "light", pair: "mono" },
];

// ═══════════════════════════════════════════════
// THEME COLORS (for PWA icon and theme_color)
// ═══════════════════════════════════════════════

// Map of theme base name to primary color (hex)
// These are used for PWA icons and manifest theme_color
export const themeColors: Record<string, { primary: string; background: string }> = {
  // Reds / Oranges / Browns
  carmine: { primary: "#e53935", background: "#1a1019" },
  crimson: { primary: "#dc2626", background: "#1a1019" },
  peach: { primary: "#fb923c", background: "#1a1019" },
  brown: { primary: "#a16207", background: "#1a1019" },
  sunset: { primary: "#f97316", background: "#1a1019" },
  sand: { primary: "#ca8a04", background: "#1a1019" },
  // Yellow
  cyber: { primary: "#eab308", background: "#0f0f0a" },
  // Greens
  sage: { primary: "#65a30d", background: "#1a1019" },
  forest: { primary: "#22c55e", background: "#1a1019" },
  mint: { primary: "#14b8a6", background: "#1a1019" },
  turquoise: { primary: "#06b6d4", background: "#0f1a1a" },
  // Blues
  cloud: { primary: "#3b82f6", background: "#1a1019" },
  ocean: { primary: "#2563eb", background: "#1a1019" },
  mist: { primary: "#64748b", background: "#1a1019" },
  // Purples / Pinks
  lavender: { primary: "#a855f7", background: "#1a1019" },
  magenta: { primary: "#d946ef", background: "#1a1019" },
  rose: { primary: "#f472b6", background: "#1a1019" },
  // Achromatic
  mono: { primary: "#a1a1aa", background: "#0a0a0a" },
};

// Get base theme name (without -light, -dark suffix)
export function getThemeBaseName(themeId: Theme): string {
  return themeId
    .replace("-light", "")
    .replace("-dark", "")
    .replace("peach-dark", "peach")
    .replace("sage-dark", "sage")
    .replace("cloud-dark", "cloud")
    .replace("mist-dark", "mist")
    .replace("sand-dark", "sand");
}

// Get hex colors for a theme
export function getThemeColors(themeId: Theme): { primary: string; background: string } {
  const baseName = getThemeBaseName(themeId);
  return themeColors[baseName] || themeColors.magenta;
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

export const getThemesForMode = (mode: ThemeMode): ThemeOption[] => {
  return themes.filter((t) => t.mode === mode);
};

export const darkThemes = getThemesForMode("dark");
export const lightThemes = getThemesForMode("light");

export const getThemeById = (id: Theme): ThemeOption | undefined => {
  return themes.find((t) => t.id === id);
};

export const getOppositeTheme = (themeId: Theme): Theme => {
  const theme = getThemeById(themeId);
  return theme?.pair || themeId;
};

export const getThemeMode = (themeId: Theme): ThemeMode => {
  const theme = getThemeById(themeId);
  return theme?.mode || "dark";
};

// ═══════════════════════════════════════════════
// HOOK - Uses settings store for cloud sync
// ═══════════════════════════════════════════════

export function useTheme() {
  const { settings, updateSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  // Get theme from settings (synced with cloud)
  const themeFromSettings = settings.theme as Theme;
  const theme: Theme = themes.some((t) => t.id === themeFromSettings)
    ? themeFromSettings
    : "magenta";
  const mode = getThemeMode(theme);

  // Apply theme on mount and when it changes
  useEffect(() => {
    setMounted(true);
    applyTheme(theme);
  }, [theme]);

  // Set theme - updates settings (triggers cloud sync via useSettingsSync)
  const setTheme = (newTheme: Theme) => {
    updateSettings({ theme: newTheme });
    applyTheme(newTheme);
  };

  // Toggle between dark/light mode (switches to paired theme)
  const toggleMode = () => {
    const oppositeTheme = getOppositeTheme(theme);
    setTheme(oppositeTheme);
  };

  // Get current theme object
  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  // Get themes for current mode (for dropdown)
  const themesForCurrentMode = getThemesForMode(mode);

  return {
    theme,
    setTheme,
    mode,
    toggleMode,
    themes,
    themesForCurrentMode,
    darkThemes,
    lightThemes,
    currentTheme,
    mounted,
  };
}

// ═══════════════════════════════════════════════
// DOM HELPERS
// ═══════════════════════════════════════════════

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
}
