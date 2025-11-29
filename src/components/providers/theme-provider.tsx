"use client";

import { useEffect } from "react";

const THEME_STORAGE_KEY = "obsidian-web-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) {
      document.documentElement.setAttribute("data-theme", storedTheme);
    }
  }, []);

  return <>{children}</>;
}
