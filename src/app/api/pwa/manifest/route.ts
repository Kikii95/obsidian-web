import { NextRequest, NextResponse } from "next/server";

// Theme colors map (keep in sync with use-theme.ts)
const themeColors: Record<string, { primary: string; background: string }> = {
  carmine: { primary: "#e53935", background: "#1a1019" },
  crimson: { primary: "#dc2626", background: "#1a1019" },
  peach: { primary: "#fb923c", background: "#1a1019" },
  brown: { primary: "#a16207", background: "#1a1019" },
  sunset: { primary: "#f97316", background: "#1a1019" },
  sand: { primary: "#ca8a04", background: "#1a1019" },
  cyber: { primary: "#eab308", background: "#0f0f0a" },
  sage: { primary: "#65a30d", background: "#1a1019" },
  forest: { primary: "#22c55e", background: "#1a1019" },
  mint: { primary: "#14b8a6", background: "#1a1019" },
  turquoise: { primary: "#06b6d4", background: "#0f1a1a" },
  cloud: { primary: "#3b82f6", background: "#1a1019" },
  ocean: { primary: "#2563eb", background: "#1a1019" },
  mist: { primary: "#64748b", background: "#1a1019" },
  lavender: { primary: "#a855f7", background: "#1a1019" },
  magenta: { primary: "#d946ef", background: "#1a1019" },
  rose: { primary: "#f472b6", background: "#1a1019" },
  mono: { primary: "#a1a1aa", background: "#0a0a0a" },
};

// Get base theme name (without -light, -dark suffix)
function getThemeBaseName(themeId: string): string {
  return themeId
    .replace("-light", "")
    .replace("-dark", "")
    .replace("peach-dark", "peach")
    .replace("sage-dark", "sage")
    .replace("cloud-dark", "cloud")
    .replace("mist-dark", "mist")
    .replace("sand-dark", "sand");
}

/**
 * GET /api/pwa/manifest?theme=magenta
 * Returns a dynamic manifest.json with theme-colored icons
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const theme = searchParams.get("theme") || "magenta";

  // Get theme colors
  const baseName = getThemeBaseName(theme);
  const colors = themeColors[baseName] || themeColors.magenta;

  const manifest = {
    name: "Obsidian Web",
    short_name: "ObsidianWeb",
    description: "Ton vault Obsidian, accessible partout",
    start_url: "/",
    display: "standalone",
    background_color: colors.background,
    theme_color: colors.primary,
    orientation: "portrait-primary",
    icons: [
      {
        src: `/api/pwa/icon?theme=${theme}&size=192`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: `/api/pwa/icon?theme=${theme}&size=512`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
    screenshots: [],
    categories: ["productivity", "utilities"],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
