"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VaultSidebar } from "@/components/navigation/vault-sidebar";
import { useVaultStore } from "@/lib/store";
import { LogOut, Menu, PanelLeftClose, PanelLeft, Settings, User, Home, Network, Tag, Link2, Gift } from "lucide-react";
import { useSelectionStore } from "@/lib/selection-store";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Logo } from "@/components/ui/logo";
import { NetworkStatus } from "@/components/ui/network-status";
import { ResizableSidebar } from "@/components/ui/resizable-sidebar";
import { GlobalLockStatus } from "@/components/lock/global-lock-status";
import { HeaderDateTime } from "@/components/ui/header-date-time";
import { QuickSwitcher } from "@/components/navigation/quick-switcher";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { useShortcutsModal } from "@/hooks/use-shortcuts-modal";
import { WhatsNewModal } from "@/components/ui/whats-new-modal";
import { useWhatsNew } from "@/hooks/use-whats-new";
import { Badge } from "@/components/ui/badge";
import { DailyNoteButton } from "@/components/navigation/daily-note-button";
import { ScrollRestoration } from "@/components/navigation/scroll-restoration";
import { RateLimitIndicator } from "@/components/ui/rate-limit-indicator";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { DynamicPwaMeta } from "@/components/pwa/dynamic-pwa-meta";
import { IosPwaPrompt } from "@/components/pwa/ios-pwa-prompt";
import { useSettingsSync } from "@/hooks/use-settings-sync";
import { useVaultConfig } from "@/hooks/use-vault-config";
import { usePinsSync } from "@/hooks/use-pins-sync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useVaultStore();
  const { exitSelectionMode } = useSelectionStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOpen: shortcutsOpen, setIsOpen: setShortcutsOpen } = useShortcutsModal();
  const { isOpen: whatsNewOpen, setIsOpen: setWhatsNewOpen, hasNewVersion } = useWhatsNew();

  // Load and validate vault config (redirects to /setup if not configured)
  const { isLoading: isVaultConfigLoading, isConfigured } = useVaultConfig();

  // Sync settings with GitHub cloud
  useSettingsSync();

  // Sync pins from database
  usePinsSync();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Exit selection mode when mobile menu closes
  const handleMobileMenuChange = (open: boolean) => {
    setMobileMenuOpen(open);
    if (!open) {
      exitSelectionMode();
    }
  };

  // Exit selection mode when desktop sidebar closes
  const handleToggleSidebar = () => {
    if (sidebarOpen) {
      // Sidebar is about to close
      exitSelectionMode();
    }
    toggleSidebar();
  };

  if (status === "loading" || isVaultConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!session || !isConfigured) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Aller au contenu principal
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm" role="banner">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={handleMobileMenuChange}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="p-4 border-b border-border/50">
                  <Logo showText />
                </div>
                {/* Mobile quick actions */}
                <div className="p-2 border-b border-border/50 flex items-center gap-1">
                  <DailyNoteButton />
                  <Button variant="ghost" size="icon" asChild title="Graph View">
                    <Link href="/graph">
                      <Network className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="Tags">
                    <Link href="/tags">
                      <Tag className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <VaultSidebar />
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={handleToggleSidebar}
              title={sidebarOpen ? "Masquer la sidebar" : "Afficher la sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeft className="h-5 w-5" />
              )}
            </Button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <span className="font-semibold text-lg hidden sm:inline">Obsidian Web</span>
            </Link>
          </div>

          {/* Center - Date/Time */}
          <HeaderDateTime />

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Rate Limit Indicator */}
            <RateLimitIndicator />

            {/* Global Lock Status */}
            <GlobalLockStatus />

            {/* Home button */}
            <Button variant="ghost" size="icon" asChild title="Vault">
              <Link href="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>

            {/* Daily Note button - hidden on mobile (available in sidebar) */}
            <div className="hidden sm:block">
              <DailyNoteButton />
            </div>

            {/* Graph button - hidden on mobile (available in sidebar) */}
            <Button variant="ghost" size="icon" asChild title="Graph View" className="hidden sm:flex">
              <Link href="/graph">
                <Network className="h-5 w-5" />
              </Link>
            </Button>

            {/* Tags button - hidden on mobile (available in sidebar) */}
            <Button variant="ghost" size="icon" asChild title="Tags" className="hidden sm:flex">
              <Link href="/tags">
                <Tag className="h-5 w-5" />
              </Link>
            </Button>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={session.user?.image || ""}
                      alt={session.user?.name || ""}
                    />
                    <AvatarFallback className="bg-primary/20">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback className="bg-primary/20">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{session.user?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      @{(session.user as { username?: string })?.username}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/shares">
                    <Link2 className="mr-2 h-4 w-4" />
                    Liens partagés
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWhatsNewOpen(true)}>
                  <Gift className="mr-2 h-4 w-4" />
                  Quoi de neuf
                  {hasNewVersion && (
                    <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0">
                      1
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Main with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - sticky to stay fixed while main content scrolls */}
        {sidebarOpen && (
          <aside
            className="hidden md:flex flex-shrink-0 border-r border-border/50 bg-sidebar sticky top-0 h-full"
            role="navigation"
            aria-label="Explorateur de fichiers"
          >
            <ResizableSidebar>
              <VaultSidebar />
            </ResizableSidebar>
          </aside>
        )}

        {/* Content */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          {children}
        </main>
      </div>

      {/* Network Status Indicator */}
      <NetworkStatus />

      {/* Quick Switcher (Ctrl+P) */}
      <QuickSwitcher />

      {/* Keyboard Shortcuts Modal (? or Ctrl+/) */}
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* What's New Modal */}
      <WhatsNewModal open={whatsNewOpen} onOpenChange={setWhatsNewOpen} />

      {/* Scroll Restoration */}
      <ScrollRestoration />

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Dynamic PWA Meta Tags (updates on theme change) */}
      <DynamicPwaMeta />

      {/* iOS Add to Home Screen Prompt */}
      <IosPwaPrompt />
    </div>
  );
}
