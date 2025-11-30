"use client";

import { useEffect, useState } from "react";

export type Theme =
  | "magenta"
  | "ocean"
  | "forest"
  | "sunset"
  | "mono"
  | "mono-inverse"
  | "rose"
  | "crimson"
  | "cyber"
  | "lavender"
  | "mint"
  | "turquoise"
  // Soft Light themes
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
}

export const themes: ThemeOption[] = [
  // Vibrant themes (dark background)
  { id: "magenta", name: "Magenta", emoji: "💜", description: "Violet vibrant" },
  { id: "lavender", name: "Lavender", emoji: "🟣", description: "Violet doux" },
  { id: "rose", name: "Rose", emoji: "🌸", description: "Rose pastel" },
  { id: "crimson", name: "Crimson", emoji: "🔴", description: "Rouge intense" },
  { id: "sunset", name: "Sunset", emoji: "🟠", description: "Orange chaud" },
  { id: "cyber", name: "Cyber", emoji: "💛", description: "Jaune néon" },
  { id: "mint", name: "Mint", emoji: "🌿", description: "Menthe fraîche" },
  { id: "forest", name: "Forest", emoji: "🟢", description: "Vert émeraude" },
  { id: "turquoise", name: "Turquoise", emoji: "🩵", description: "Cyan tropical" },
  { id: "ocean", name: "Ocean", emoji: "🔵", description: "Bleu profond" },
  { id: "mono", name: "Mono Inverse", emoji: "⚫", description: "Noir & blanc" },
  { id: "mono-inverse", name: "Mono", emoji: "⚪", description: "Blanc & noir" },
  // Soft Light themes (light background, easy on the eyes)
  { id: "cream", name: "Cream", emoji: "🍦", description: "Beige doux" },
  { id: "cloud", name: "Cloud", emoji: "☁️", description: "Bleu ciel" },
  { id: "sage", name: "Sage", emoji: "🌿", description: "Vert sauge" },
  { id: "peach", name: "Peach", emoji: "🍑", description: "Pêche doux" },
  { id: "mist", name: "Mist", emoji: "🌫️", description: "Gris bleuté" },
  { id: "sand", name: "Sand", emoji: "🏖️", description: "Sable chaud" },
];

const THEME_STORAGE_KEY = "obsidian-web-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("magenta");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (storedTheme && themes.some((t) => t.id === storedTheme)) {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  };

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  return {
    theme,
    setTheme,
    themes,
    currentTheme,
    mounted,
  };
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
}
