"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
import { LogOut, Menu, PanelLeftClose, PanelLeft, Settings, User, Home, Network } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Logo } from "@/components/ui/logo";
import { NetworkStatus } from "@/components/ui/network-status";
import { ResizableSidebar } from "@/components/ui/resizable-sidebar";
import { GlobalLockStatus } from "@/components/lock/global-lock-status";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar } = useVaultStore();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="p-4 border-b border-border/50">
                  <Logo showText />
                </div>
                <VaultSidebar />
              </SheetContent>
            </Sheet>

            {/* Desktop sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={toggleSidebar}
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

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Global Lock Status */}
            <GlobalLockStatus />

            {/* Home button */}
            <Button variant="ghost" size="icon" asChild title="Vault">
              <Link href="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>

            {/* Graph button */}
            <Button variant="ghost" size="icon" asChild title="Graph View">
              <Link href="/graph">
                <Network className="h-5 w-5" />
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

      {/* Main with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - sticky to stay fixed while main content scrolls */}
        {sidebarOpen && (
          <aside className="hidden md:flex flex-shrink-0 border-r border-border/50 bg-sidebar sticky top-0 h-full">
            <ResizableSidebar>
              <VaultSidebar />
            </ResizableSidebar>
          </aside>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Network Status Indicator */}
      <NetworkStatus />
    </div>
  );
}
