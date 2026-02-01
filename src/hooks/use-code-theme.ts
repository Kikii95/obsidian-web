"use client";

import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { useSettingsStore } from "@/lib/settings-store";
import { getAutoTheme, defaultCodeTheme } from "@/data/code-themes";

const THEME_STYLE_ID = "hljs-theme-style";

export function useCodeTheme() {
  const { settings } = useSettingsStore();
  const { resolvedTheme } = useTheme();
  const themeSetting = settings.codeSyntaxTheme || defaultCodeTheme;

  // Resolve the actual theme to use
  const resolvedCodeTheme = useMemo(() => {
    if (themeSetting === "auto") {
      const autoTheme = getAutoTheme();
      if (autoTheme) {
        // Use dark/light variant based on global theme
        return resolvedTheme === "dark"
          ? autoTheme.darkVariant || "github-dark"
          : autoTheme.lightVariant || "github";
      }
      // Fallback if auto theme not found
      return resolvedTheme === "dark" ? "github-dark" : "github";
    }
    return themeSetting;
  }, [themeSetting, resolvedTheme]);

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
    link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${resolvedCodeTheme}.min.css`;

    document.head.appendChild(link);

    return () => {
      // Cleanup on unmount
      const styleToRemove = document.getElementById(THEME_STYLE_ID);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [resolvedCodeTheme]);

  return {
    theme: resolvedCodeTheme,
    isAuto: themeSetting === "auto",
    setting: themeSetting,
  };
}
