import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Obsidian Web",
  description: "Ton vault Obsidian, accessible partout",
  // Manifest is dynamically set by DynamicPwaMeta component based on theme
  manifest: "/api/pwa/manifest?theme=magenta",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Obsidian Web",
  },
  icons: {
    // Default icons (will be overridden by DynamicPwaMeta when theme loads)
    icon: [
      { url: "/api/pwa/icon?theme=magenta&size=192", sizes: "192x192", type: "image/svg+xml" },
      { url: "/api/pwa/icon?theme=magenta&size=512", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/api/pwa/icon?theme=magenta&size=192", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1019",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
