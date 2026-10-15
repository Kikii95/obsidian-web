import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Mono, IBM_Plex_Sans, Literata } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { RouteMarker } from "@/components/da/route-marker";
import "./globals.css";
import "@/styles/da/index.css";

// Polices de la DA (docs/direction-artistique.md §4) : la fiche, la cote, la main du lecteur.
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], style: ["normal", "italic"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Obsidian Web",
  description: "Ton second brain. Connecté partout.",
  // Manifest is dynamically set by DynamicPwaMeta component based on theme
  manifest: "/api/pwa/manifest?theme=magenta",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Obsidian Web",
  },
  icons: {
    // Raster PNGs — home-screen / install icons must be PNG (iOS + Android
    // ignore SVG icons and fall back to a generated letter monogram).
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#100D13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${literata.variable} ${plexMono.variable} ${plexSans.variable} ${caveat.variable} table-obsidienne antialiased min-h-screen`}
      >
        <SessionProvider>
          <RouteMarker />
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
