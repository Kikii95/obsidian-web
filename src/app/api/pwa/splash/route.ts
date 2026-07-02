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

  <!-- Centered Logo (brain network) -->
  <g transform="translate(${width / 2 - 64}, ${height / 2 - 64})">
    <svg width="128" height="128" viewBox="0 0 24 24">
      <g fill="none" stroke="url(#logo-gradient)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11.4 4.6C10.6 2.9 8.4 2.7 7.6 4.3C6 3.7 4.4 4.9 5 6.5C3.3 6.5 2.6 8.3 4 9.2C2.5 9.8 2.6 11.6 4.1 12.1C3.1 13.1 3.8 14.9 5.5 14.8C5.3 16.2 6.5 17.3 8 17C8.6 18 10 18.3 10.7 17.6C11.05 18.4 10.95 19 10.5 19.3"/>
        <path d="M12.6 4.6C13.4 2.9 15.6 2.7 16.4 4.3C18 3.7 19.6 4.9 19 6.5C20.7 6.5 21.4 8.3 20 9.2C21.5 9.8 21.4 11.6 19.9 12.1C20.9 13.1 20.2 14.9 18.5 14.8C18.7 16.2 17.5 17.3 16 17C15.4 18 14 18.3 13.3 17.6C12.95 18.4 13.05 19 13.5 19.3"/>
      </g>
      <g stroke="url(#logo-gradient)" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 5.6 12 9.8"/><path d="M12 9.8 7.7 12.7"/><path d="M12 9.8 16.3 12.7"/>
        <path d="M7.7 12.7 8.5 16.7"/><path d="M16.3 12.7 15.5 16.7"/>
      </g>
      <g fill="url(#logo-gradient)">
        <circle cx="12" cy="5.6" r="1.55"/><circle cx="12" cy="9.8" r="1.95"/>
        <circle cx="7.7" cy="12.7" r="1.5"/><circle cx="16.3" cy="12.7" r="1.5"/>
        <circle cx="8.5" cy="16.7" r="1.5"/><circle cx="15.5" cy="16.7" r="1.5"/>
      </g>
    </svg>
  </g>

  <!-- App name -->
  <text x="${width / 2}" y="${height / 2 + 100}" text-anchor="middle" fill="${colors.primary}" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="600">
    Obsidian Web
  </text>

  <!-- Tagline -->
  <text x="${width / 2}" y="${height / 2 + 138}" text-anchor="middle" fill="#8a7d88" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400" letter-spacing="1.5">
    Ton second brain. Connecté partout.
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
