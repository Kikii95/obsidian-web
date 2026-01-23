import { NextRequest, NextResponse } from "next/server";

// Theme color mappings (simplified - matches icon colors)
const themeColors: Record<string, { primary: string; bg: string }> = {
  carmine: { primary: "#dc2626", bg: "#1a0505" },
  crimson: { primary: "#e11d48", bg: "#1a0510" },
  peach: { primary: "#f97316", bg: "#1a0d05" },
  brown: { primary: "#a16207", bg: "#1a1405" },
  sunset: { primary: "#ea580c", bg: "#1a0a05" },
  sand: { primary: "#ca8a04", bg: "#1a1505" },
  cyber: { primary: "#84cc16", bg: "#0a1a05" },
  sage: { primary: "#16a34a", bg: "#051a0a" },
  forest: { primary: "#059669", bg: "#051a10" },
  mint: { primary: "#0d9488", bg: "#051a18" },
  turquoise: { primary: "#06b6d4", bg: "#051518" },
  cloud: { primary: "#0ea5e9", bg: "#05101a" },
  ocean: { primary: "#3b82f6", bg: "#050a1a" },
  mist: { primary: "#6366f1", bg: "#08051a" },
  lavender: { primary: "#8b5cf6", bg: "#0a051a" },
  magenta: { primary: "#d946ef", bg: "#1a0519" },
  rose: { primary: "#ec4899", bg: "#1a0510" },
  mono: { primary: "#a1a1aa", bg: "#0a0a0a" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get("theme") || "magenta";
  const width = parseInt(searchParams.get("w") || "1170");
  const height = parseInt(searchParams.get("h") || "2532");

  const colors = themeColors[theme] || themeColors.magenta;

  // Generate SVG splash screen with centered logo
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg}"/>
      <stop offset="100%" style="stop-color:#000000"/>
    </linearGradient>
    <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${adjustColor(colors.primary, -30)}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>

  <!-- Centered Logo (book icon) -->
  <g transform="translate(${width / 2 - 64}, ${height / 2 - 64})">
    <svg width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="url(#logo-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      <path d="M8 7h6"/>
      <path d="M8 11h8"/>
    </svg>
  </g>

  <!-- App name -->
  <text x="${width / 2}" y="${height / 2 + 100}" text-anchor="middle" fill="${colors.primary}" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="600">
    Obsidian Web
  </text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// Helper to darken a hex color
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
