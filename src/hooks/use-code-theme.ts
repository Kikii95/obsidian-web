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
  // Note: resolvedTheme can be undefined during SSR/hydration
  const resolvedCodeTheme = useMemo(() => {
    if (themeSetting === "auto") {
      const autoTheme = getAutoTheme();
      // Default to dark if resolvedTheme is undefined (SSR)
      const isDark = resolvedTheme === "dark" || resolvedTheme === undefined;
      if (autoTheme) {
        return isDark
          ? autoTheme.darkVariant || "github-dark"
          : autoTheme.lightVariant || "github";
      }
      return isDark ? "github-dark" : "github";
    }
    return themeSetting;
  }, [themeSetting, resolvedTheme]);

  useEffect(() => {
    // Remove existing theme style if any
    const existingStyle = document.getElementById(THEME_STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // In "auto" mode, use integrated CSS styles from globals.css
    // No need to load external CDN stylesheet
    if (themeSetting === "auto") {
      return;
    }

    // For specific themes, load from CDN
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
  }, [resolvedCodeTheme, themeSetting]);

  return {
    theme: resolvedCodeTheme,
    isAuto: themeSetting === "auto",
    setting: themeSetting,
  };
}
