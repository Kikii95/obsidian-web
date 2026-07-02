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
    <svg width="${size * 0.52}" height="${size * 0.52}" viewBox="0 0 24 24">
      <g fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11.4 4.6C10.6 2.9 8.4 2.7 7.6 4.3C6 3.7 4.4 4.9 5 6.5C3.3 6.5 2.6 8.3 4 9.2C2.5 9.8 2.6 11.6 4.1 12.1C3.1 13.1 3.8 14.9 5.5 14.8C5.3 16.2 6.5 17.3 8 17C8.6 18 10 18.3 10.7 17.6C11.05 18.4 10.95 19 10.5 19.3"/>
        <path d="M12.6 4.6C13.4 2.9 15.6 2.7 16.4 4.3C18 3.7 19.6 4.9 19 6.5C20.7 6.5 21.4 8.3 20 9.2C21.5 9.8 21.4 11.6 19.9 12.1C20.9 13.1 20.2 14.9 18.5 14.8C18.7 16.2 17.5 17.3 16 17C15.4 18 14 18.3 13.3 17.6C12.95 18.4 13.05 19 13.5 19.3"/>
      </g>
      <g stroke="white" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 5.6 12 9.8"/><path d="M12 9.8 7.7 12.7"/><path d="M12 9.8 16.3 12.7"/>
        <path d="M7.7 12.7 8.5 16.7"/><path d="M16.3 12.7 15.5 16.7"/>
      </g>
      <g fill="white">
        <circle cx="12" cy="5.6" r="1.55"/><circle cx="12" cy="9.8" r="1.95"/>
        <circle cx="7.7" cy="12.7" r="1.5"/><circle cx="16.3" cy="12.7" r="1.5"/>
        <circle cx="8.5" cy="16.7" r="1.5"/><circle cx="15.5" cy="16.7" r="1.5"/>
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
