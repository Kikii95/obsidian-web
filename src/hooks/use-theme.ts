"use client";

import { useEffect, useState } from "react";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type ThemeMode = "dark" | "light";

export type Theme =
  // Dark themes (vibrant)
  | "magenta"
  | "ocean"
  | "forest"
  | "sunset"
  | "mono"
  | "rose"
  | "crimson"
  | "cyber"
  | "lavender"
  | "mint"
  | "turquoise"
  // Dark themes (soft)
  | "cream-dark"
  | "cloud-dark"
  | "sage-dark"
  | "peach-dark"
  | "mist-dark"
  | "sand-dark"
  // Light themes (vibrant)
  | "magenta-light"
  | "ocean-light"
  | "forest-light"
  | "sunset-light"
  | "mono-inverse"
  | "rose-light"
  | "crimson-light"
  | "cyber-light"
  | "lavender-light"
  | "mint-light"
  | "turquoise-light"
  // Light themes (soft)
  | "cream"
  | "cloud"
  | "sage"
  | "peach"
  | "mist"
  | "sand";

export interface ThemeOption {
  id: Theme;
  name: string;
  emoji: string;
  description: string;
  mode: ThemeMode;
  pair: Theme; // The opposite mode version
}

// ═══════════════════════════════════════════════
// THEME DEFINITIONS
// ═══════════════════════════════════════════════

export const themes: ThemeOption[] = [
  // ─────────────────────────────────────────────
  // DARK THEMES
  // ─────────────────────────────────────────────
  { id: "magenta", name: "Magenta", emoji: "💜", description: "Violet vibrant", mode: "dark", pair: "magenta-light" },
  { id: "lavender", name: "Lavender", emoji: "🟣", description: "Violet doux", mode: "dark", pair: "lavender-light" },
  { id: "rose", name: "Rose", emoji: "🌸", description: "Rose pastel", mode: "dark", pair: "rose-light" },
  { id: "crimson", name: "Crimson", emoji: "🔴", description: "Rouge intense", mode: "dark", pair: "crimson-light" },
  { id: "sunset", name: "Sunset", emoji: "🟠", description: "Orange chaud", mode: "dark", pair: "sunset-light" },
  { id: "cyber", name: "Cyber", emoji: "💛", description: "Jaune néon", mode: "dark", pair: "cyber-light" },
  { id: "mint", name: "Mint", emoji: "🌿", description: "Menthe fraîche", mode: "dark", pair: "mint-light" },
  { id: "forest", name: "Forest", emoji: "🟢", description: "Vert émeraude", mode: "dark", pair: "forest-light" },
  { id: "turquoise", name: "Turquoise", emoji: "🩵", description: "Cyan tropical", mode: "dark", pair: "turquoise-light" },
  { id: "ocean", name: "Ocean", emoji: "🔵", description: "Bleu profond", mode: "dark", pair: "ocean-light" },
  { id: "mono", name: "Mono", emoji: "⚫", description: "Noir & blanc", mode: "dark", pair: "mono-inverse" },
  // Soft dark
  { id: "cream-dark", name: "Cream", emoji: "🍦", description: "Beige chaud", mode: "dark", pair: "cream" },
  { id: "cloud-dark", name: "Cloud", emoji: "☁️", description: "Bleu ciel", mode: "dark", pair: "cloud" },
  { id: "sage-dark", name: "Sage", emoji: "🧘", description: "Vert sauge", mode: "dark", pair: "sage" },
  { id: "peach-dark", name: "Peach", emoji: "🍑", description: "Pêche doux", mode: "dark", pair: "peach" },
  { id: "mist-dark", name: "Mist", emoji: "🌫️", description: "Gris bleuté", mode: "dark", pair: "mist" },
  { id: "sand-dark", name: "Sand", emoji: "🏖️", description: "Sable chaud", mode: "dark", pair: "sand" },

  // ─────────────────────────────────────────────
  // LIGHT THEMES
  // ─────────────────────────────────────────────
  { id: "magenta-light", name: "Magenta", emoji: "💜", description: "Violet clair", mode: "light", pair: "magenta" },
  { id: "lavender-light", name: "Lavender", emoji: "🟣", description: "Lavande clair", mode: "light", pair: "lavender" },
  { id: "rose-light", name: "Rose", emoji: "🌸", description: "Rose clair", mode: "light", pair: "rose" },
  { id: "crimson-light", name: "Crimson", emoji: "🔴", description: "Rouge clair", mode: "light", pair: "crimson" },
  { id: "sunset-light", name: "Sunset", emoji: "🟠", description: "Orange clair", mode: "light", pair: "sunset" },
  { id: "cyber-light", name: "Cyber", emoji: "💛", description: "Jaune clair", mode: "light", pair: "cyber" },
  { id: "mint-light", name: "Mint", emoji: "🌿", description: "Menthe clair", mode: "light", pair: "mint" },
  { id: "forest-light", name: "Forest", emoji: "🟢", description: "Forêt clair", mode: "light", pair: "forest" },
  { id: "turquoise-light", name: "Turquoise", emoji: "🩵", description: "Turquoise clair", mode: "light", pair: "turquoise" },
  { id: "ocean-light", name: "Ocean", emoji: "🔵", description: "Océan clair", mode: "light", pair: "ocean" },
  { id: "mono-inverse", name: "Mono", emoji: "⚪", description: "Blanc & noir", mode: "light", pair: "mono" },
  // Soft light
  { id: "cream", name: "Cream", emoji: "🍦", description: "Beige doux", mode: "light", pair: "cream-dark" },
  { id: "cloud", name: "Cloud", emoji: "☁️", description: "Bleu ciel", mode: "light", pair: "cloud-dark" },
  { id: "sage", name: "Sage", emoji: "🧘", description: "Vert sauge", mode: "light", pair: "sage-dark" },
  { id: "peach", name: "Peach", emoji: "🍑", description: "Pêche doux", mode: "light", pair: "peach-dark" },
  { id: "mist", name: "Mist", emoji: "🌫️", description: "Gris bleuté", mode: "light", pair: "mist-dark" },
  { id: "sand", name: "Sand", emoji: "🏖️", description: "Sable chaud", mode: "light", pair: "sand-dark" },
];

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
// STORAGE
// ═══════════════════════════════════════════════

const THEME_STORAGE_KEY = "obsidian-web-theme";
const MODE_STORAGE_KEY = "obsidian-web-theme-mode";

// ═══════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("magenta");
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    setMounted(true);

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;

    if (storedTheme && themes.some((t) => t.id === storedTheme)) {
      setThemeState(storedTheme);
      applyTheme(storedTheme);

      // Sync mode with theme
      const themeMode = getThemeMode(storedTheme);
      setModeState(themeMode);
      localStorage.setItem(MODE_STORAGE_KEY, themeMode);
    } else if (storedMode) {
      setModeState(storedMode);
    }
  }, []);

  // Set theme directly
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);

    // Update mode to match theme
    const themeMode = getThemeMode(newTheme);
    setModeState(themeMode);
    localStorage.setItem(MODE_STORAGE_KEY, themeMode);
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
