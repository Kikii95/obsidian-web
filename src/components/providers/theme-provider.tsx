"use client";

import { useEffect } from "react";

// Settings store key (same as zustand persist)
const SETTINGS_STORAGE_KEY = "obsidian-web-settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Read theme from settings store (zustand persist format)
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const theme = parsed?.state?.settings?.theme;
        if (theme) {
          document.documentElement.setAttribute("data-theme", theme);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  return <>{children}</>;
}
