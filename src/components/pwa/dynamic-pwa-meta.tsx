"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings-store";
import { getThemeColors, Theme } from "@/hooks/use-theme";

// iOS splash screen sizes (device width, device height, pixel ratio)
const IOS_SPLASH_SCREENS = [
  // iPhone 15 Pro Max, 14 Pro Max
  { w: 1290, h: 2796, ratio: 3 },
  // iPhone 15 Pro, 14 Pro
  { w: 1179, h: 2556, ratio: 3 },
  // iPhone 15, 15 Plus, 14, 14 Plus
  { w: 1170, h: 2532, ratio: 3 },
  { w: 1284, h: 2778, ratio: 3 },
  // iPhone 13 mini, 12 mini
  { w: 1080, h: 2340, ratio: 3 },
  // iPhone 11 Pro Max, XS Max
  { w: 1242, h: 2688, ratio: 3 },
  // iPhone 11 Pro, X, XS
  { w: 1125, h: 2436, ratio: 3 },
  // iPhone 11, XR
  { w: 828, h: 1792, ratio: 2 },
  // iPhone 8 Plus
  { w: 1242, h: 2208, ratio: 3 },
  // iPhone 8, SE
  { w: 750, h: 1334, ratio: 2 },
  // iPad Pro 12.9"
  { w: 2048, h: 2732, ratio: 2 },
  // iPad Pro 11"
  { w: 1668, h: 2388, ratio: 2 },
  // iPad Air, iPad 10th gen
  { w: 1640, h: 2360, ratio: 2 },
  // iPad 9th gen
  { w: 1620, h: 2160, ratio: 2 },
  // iPad mini
  { w: 1488, h: 2266, ratio: 2 },
];

/**
 * Component that dynamically updates PWA meta tags based on current theme.
 * Updates:
 * - <link rel="manifest"> to point to dynamic manifest with theme
 * - <meta name="theme-color"> to match theme primary color
 * - Apple touch icon
 * - Apple splash screens
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

    // Update/create iOS splash screens
    // Remove old splash links first
    document.querySelectorAll('link[rel="apple-touch-startup-image"]').forEach((el) => el.remove());

    // Add new splash links with current theme
    IOS_SPLASH_SCREENS.forEach(({ w, h, ratio }) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "apple-touch-startup-image");
      link.setAttribute("href", `/api/pwa/splash?theme=${theme}&w=${w}&h=${h}`);
      // Media query to match device
      const deviceW = Math.round(w / ratio);
      const deviceH = Math.round(h / ratio);
      link.setAttribute(
        "media",
        `(device-width: ${deviceW}px) and (device-height: ${deviceH}px) and (-webkit-device-pixel-ratio: ${ratio})`
      );
      document.head.appendChild(link);
    });
  }, [theme]);

  // This component doesn't render anything visible
  return null;
}
