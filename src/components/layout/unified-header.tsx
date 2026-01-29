"use client";

import { memo } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { SidebarToggle } from "./sidebar-toggle";
import { HeaderBreadcrumb } from "./header-breadcrumb";
import {
  Home,
  Network,
  Tag,
  LogOut,
  Settings,
  User,
  Link2,
  Star,
  GitBranch,
  ExternalLink,
  Clock,
  LogIn,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutContext, useLayoutFeatures } from "@/contexts/layout-context";
import type { BreadcrumbItem, UnifiedHeaderProps } from "@/types/layout";
import type { RateLimitInfo } from "@/lib/github";

/**
 * Unified header component for all layout modes
 * Adapts based on mode and feature flags
 */
export const UnifiedHeader = memo(function UnifiedHeader({
  left,
  center,
  right,
  breadcrumb,
  sticky = true,
  className,
}: UnifiedHeaderProps) {
  const { mode, metadata, sidebar, toggleSidebar } = useLayoutContext();
  const features = useLayoutFeatures();
  const { data: session } = useSession();

  return (
    <header
      className={cn(
        "z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm",
        sticky && "sticky top-0",
        className
      )}
      role="banner"
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {left ?? (
            <>
              {/* Sidebar toggle */}
              <SidebarToggle
                isOpen={sidebar.open}
                onToggle={toggleSidebar}
                variant="icon"
                className="hidden md:flex"
              />

              {/* Mobile menu toggle */}
              <SidebarToggle
                isOpen={sidebar.open}
                onToggle={toggleSidebar}
                variant="button"
                className="md:hidden"
              />

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <Logo />
                <span className="font-semibold text-lg hidden sm:inline">
                  {mode === "dashboard" && "Obsidian Web"}
                  {mode === "share" && "Shared Folder"}
                  {mode === "temp" && "Explorer"}
                </span>
              </Link>
            </>
          )}
        </div>

        {/* Center */}
        <div className="hidden md:flex items-center">
          {center ?? <DefaultCenterContent mode={mode} metadata={metadata} />}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {right ?? (
            <DefaultRightContent
              mode={mode}
              features={features}
              session={session}
              metadata={metadata}
            />
          )}
        </div>
      </div>

      {/* Breadcrumb row (if provided) */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="px-4 pb-2 -mt-1">
          <HeaderBreadcrumb items={breadcrumb} />
        </div>
      )}
    </header>
  );
});

/**
 * Default center content based on mode
 */
function DefaultCenterContent({
  mode,
  metadata,
}: {
  mode: string;
  metadata: ReturnType<typeof useLayoutContext>["metadata"];
}) {
  if (mode === "temp" && metadata.mode === "temp") {
    const { rateLimit } = metadata.data;
    if (rateLimit) {
      return <RateLimitDisplay rateLimit={rateLimit} />;
    }
  }

  if (mode === "share" && metadata.mode === "share") {
    const { expiresAt } = metadata.data;
    if (expiresAt) {
      return <ExpirationDisplay expiresAt={expiresAt} />;
    }
  }

  // Dashboard shows nothing in center by default
  return null;
}

/**
 * Default right content based on mode and features
 */
function DefaultRightContent({
  mode,
  features,
  session,
  metadata,
}: {
  mode: string;
  features: ReturnType<typeof useLayoutFeatures>;
  session: ReturnType<typeof useSession>["data"];
  metadata: ReturnType<typeof useLayoutContext>["metadata"];
}) {
  return (
    <>
      {/* Exit Explorer button for temp vault */}
      {mode === "temp" && (
        <Button variant="ghost" size="sm" asChild title="Exit Explorer">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exit</span>
          </Link>
        </Button>
      )}

      {/* GitHub link for temp vault */}
      {features.header.showGitHubLink && metadata.mode === "temp" && (
        <Button variant="ghost" size="icon" asChild title="View on GitHub">
          <a
            href={`https://github.com/${metadata.data.owner}/${metadata.data.repo}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </Button>
      )}

      {/* Branch badge for temp vault */}
      {features.header.showBranchBadge && metadata.mode === "temp" && (
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
          <GitBranch className="h-3 w-3" />
          <span>{metadata.data.branch}</span>
        </div>
      )}

      {/* Stars for temp vault */}
      {features.header.showStars && metadata.mode === "temp" && metadata.data.stars > 0 && (
        <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="h-4 w-4" />
          <span>{metadata.data.stars}</span>
        </div>
      )}

      {/* Quick actions for dashboard */}
      {features.header.showQuickActions && (
        <>
          <Button variant="ghost" size="icon" asChild title="Vault">
            <Link href="/">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Graph View" className="hidden sm:flex">
            <Link href="/graph">
              <Network className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Tags" className="hidden sm:flex">
            <Link href="/tags">
              <Tag className="h-5 w-5" />
            </Link>
          </Button>
        </>
      )}

      {/* Theme switcher (always shown) */}
      <ThemeSwitcher />

      {/* User menu for dashboard */}
      {features.header.showUserMenu && session && (
        <UserMenu session={session} />
      )}

      {/* Login prompt for share/temp */}
      {features.header.showLoginPrompt && !session && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">
            <LogIn className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Log in</span>
          </Link>
        </Button>
      )}

      {/* Show "My Vault" link when logged in on share/temp pages */}
      {features.header.showLoginPrompt && session && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">My Vault</span>
          </Link>
        </Button>
      )}
    </>
  );
}

/**
 * User menu dropdown
 */
function UserMenu({ session }: { session: NonNullable<ReturnType<typeof useSession>["data"]> }) {
  return (
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
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/shares">
            <Link2 className="mr-2 h-4 w-4" />
            Shared Links
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Rate limit display for temp vault
 * Shows auth status based on rate limit (5000 = authenticated, 60 = anonymous)
 */
function RateLimitDisplay({ rateLimit }: { rateLimit: RateLimitInfo }) {
  const isAuthenticated = rateLimit.limit > 100; // 5000 for auth, 60 for anon
  const percentage = (rateLimit.remaining / rateLimit.limit) * 100;
  const colorClass =
    percentage > 30
      ? "text-green-500"
      : percentage > 10
      ? "text-amber-500"
      : "text-red-500";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn(
        "px-1.5 py-0.5 rounded text-xs",
        isAuthenticated ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
      )}>
        {isAuthenticated ? "Auth" : "Anon"}
      </span>
      <span className="text-muted-foreground">API:</span>
      <span className={colorClass}>
        {rateLimit.remaining}/{rateLimit.limit}
      </span>
    </div>
  );
}

/**
 * Expiration display for share pages
 */
function ExpirationDisplay({ expiresAt }: { expiresAt: Date }) {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const isExpiringSoon = days < 1;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
        isExpiringSoon ? "bg-amber-500/10 text-amber-500" : "bg-muted"
      )}
    >
      <Clock className="h-3 w-3" />
      <span>
        {days > 0 ? `${days}d ${hours}h` : `${hours}h`} remaining
      </span>
    </div>
  );
}
