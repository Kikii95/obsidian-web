"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings-store";

const THEME_STYLE_ID = "hljs-theme-style";

export function useCodeTheme() {
  const { settings } = useSettingsStore();
  const theme = settings.codeSyntaxTheme || "atom-one-dark";

  useEffect(() => {
    // Remove existing theme style if any
    const existingStyle = document.getElementById(THEME_STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create a link element for the highlight.js CSS
    const link = document.createElement("link");
    link.id = THEME_STYLE_ID;
    link.rel = "stylesheet";
    link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${theme}.min.css`;

    document.head.appendChild(link);

    return () => {
      // Cleanup on unmount
      const styleToRemove = document.getElementById(THEME_STYLE_ID);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [theme]);

  return { theme };
}
