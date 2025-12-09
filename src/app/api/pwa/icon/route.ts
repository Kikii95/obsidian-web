import { NextRequest, NextResponse } from "next/server";

// Theme colors map (keep in sync with use-theme.ts)
const themeColors: Record<string, string> = {
  carmine: "#e53935",
  crimson: "#dc2626",
  peach: "#fb923c",
  brown: "#a16207",
  sunset: "#f97316",
  sand: "#ca8a04",
  cyber: "#eab308",
  sage: "#65a30d",
  forest: "#22c55e",
  mint: "#14b8a6",
  turquoise: "#06b6d4",
  cloud: "#3b82f6",
  ocean: "#2563eb",
  mist: "#64748b",
  lavender: "#a855f7",
  magenta: "#d946ef",
  rose: "#f472b6",
  mono: "#a1a1aa",
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

// Generate SVG icon with theme color
function generateIcon(size: number, primaryColor: string): string {
  // Create a gradient from the primary color
  const lighterColor = lightenColor(primaryColor, 20);
  const darkerColor = darkenColor(primaryColor, 20);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${lighterColor};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${darkerColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  </g>
</svg>`;
}

// Lighten a hex color
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// Darken a hex color
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * GET /api/pwa/icon?theme=magenta&size=192
 * Returns an SVG icon with the specified theme color
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const theme = searchParams.get("theme") || "magenta";
  const size = parseInt(searchParams.get("size") || "192", 10);

  // Validate size
  const validSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const actualSize = validSizes.includes(size) ? size : 192;

  // Get theme color
  const baseName = getThemeBaseName(theme);
  const primaryColor = themeColors[baseName] || themeColors.magenta;

  // Generate SVG
  const svg = generateIcon(actualSize, primaryColor);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
