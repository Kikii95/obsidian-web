"use client";

import { useCallback, useEffect, useState } from "react";
import { cssColorToHex } from "@/lib/css-color";
import { CLUSTER_PALETTE_SIZE } from "@/lib/graph/constants";
import { useTheme } from "@/hooks/use-theme";

export interface GraphPalette {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  clusters: string[];
  mode: "dark" | "light";
}

const FALLBACK_CLUSTERS = ["#d946ef", "#22c55e", "#3b82f6", "#f97316", "#a855f7"];

const FALLBACK: GraphPalette = {
  primary: "#d946ef",
  accent: "#f0abfc",
  background: "#1a1019",
  foreground: "#f9fafb",
  muted: "#9ca3af",
  border: "#374151",
  clusters: FALLBACK_CLUSTERS,
  mode: "dark",
};

function readPalette(mode: "dark" | "light"): GraphPalette {
  const clusters: string[] = [];
  for (let i = 0; i < CLUSTER_PALETTE_SIZE; i += 1) {
    clusters.push(cssColorToHex(`--chart-${i + 1}`, FALLBACK_CLUSTERS[i]));
  }
  return {
    primary: cssColorToHex("--primary", FALLBACK.primary),
    accent: cssColorToHex("--accent", FALLBACK.accent),
    background: cssColorToHex("--background", FALLBACK.background),
    foreground: cssColorToHex("--foreground", FALLBACK.foreground),
    muted: cssColorToHex("--muted-foreground", FALLBACK.muted),
    border: cssColorToHex("--border", FALLBACK.border),
    clusters,
    mode,
  };
}

/**
 * Live theme palette for the 3D scene. Reads oklch CSS vars through the canvas
 * hex bridge and re-reads whenever the theme changes — keyed on useTheme().theme
 * AND a MutationObserver on documentElement[data-theme] (double-rAF so the CSS
 * vars have recomputed before we sample them). THREE.Color can't parse oklch,
 * so everything is pre-converted to hex here.
 */
export function useThemeColors(): GraphPalette {
  const { theme, mode } = useTheme();
  const [palette, setPalette] = useState<GraphPalette>(FALLBACK);

  const refresh = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setPalette(readPalette(mode)))
    );
  }, [mode]);

  useEffect(() => {
    refresh();
  }, [theme, refresh]);

  useEffect(() => {
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [refresh]);

  return palette;
}
