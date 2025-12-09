"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings-store";
import { getThemeColors, Theme } from "@/hooks/use-theme";

/**
 * Component that dynamically updates PWA meta tags based on current theme.
 * Updates:
 * - <link rel="manifest"> to point to dynamic manifest with theme
 * - <meta name="theme-color"> to match theme primary color
 * - Apple touch icon
 */
export function DynamicPwaMeta() {
  const { settings } = useSettingsStore();
  const theme = settings.theme as Theme;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const colors = getThemeColors(theme);

    // Update theme-color meta tag
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", colors.primary);
    } else {
      themeColorMeta = document.createElement("meta");
      themeColorMeta.setAttribute("name", "theme-color");
      themeColorMeta.setAttribute("content", colors.primary);
      document.head.appendChild(themeColorMeta);
    }

    // Update manifest link
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute("href", `/api/pwa/manifest?theme=${theme}`);
    } else {
      manifestLink = document.createElement("link");
      manifestLink.setAttribute("rel", "manifest");
      manifestLink.setAttribute("href", `/api/pwa/manifest?theme=${theme}`);
      document.head.appendChild(manifestLink);
    }

    // Update apple-touch-icon
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) {
      appleIcon.setAttribute("href", `/api/pwa/icon?theme=${theme}&size=192`);
    }

    // Update regular icons
    const iconLinks = document.querySelectorAll('link[rel="icon"]');
    iconLinks.forEach((link) => {
      const sizes = link.getAttribute("sizes");
      const size = sizes?.split("x")[0] || "192";
      link.setAttribute("href", `/api/pwa/icon?theme=${theme}&size=${size}`);
      link.setAttribute("type", "image/svg+xml");
    });
  }, [theme]);

  // This component doesn't render anything visible
  return null;
}
