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
  <g transform="translate(${size * 0.24}, ${size * 0.24})">
    <svg width="${size * 0.52}" height="${size * 0.52}" viewBox="0 0 512 512">
      <g fill="none" stroke="white" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 149C235 107 171 128 171 171C128 171 107 213 107 235C85 256 85 299 107 320C85 363 128 405 171 405C192 448 235 427 235 405"/>
        <path d="M256 149C277 107 341 128 341 171C384 171 405 213 405 235C427 256 427 299 405 320C427 363 384 405 341 405C320 448 277 427 277 405"/>
      </g>
      <g fill="none" stroke="white" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 171V235M256 235L192 277M256 235L320 277M192 277C192 299 192 320 213 341M320 277C320 299 320 320 299 341"/>
      </g>
      <g fill="white">
        <circle cx="256" cy="171" r="31"/>
        <circle cx="256" cy="235" r="28"/>
        <circle cx="192" cy="277" r="30"/>
        <circle cx="320" cy="277" r="30"/>
        <circle cx="213" cy="341" r="22"/>
        <circle cx="299" cy="341" r="22"/>
      </g>
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
