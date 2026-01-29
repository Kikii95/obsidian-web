"use client";

import { Button } from "@/components/ui/button";
import { PanelLeft, PanelLeftClose, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarToggleProps } from "@/types/layout";

/**
 * Unified sidebar toggle button
 * Used across all layout modes with consistent styling
 */
export function SidebarToggle({
  isOpen,
  onToggle,
  variant = "icon",
  className,
}: SidebarToggleProps) {
  // Desktop variant (panel icons)
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn("shrink-0", className)}
        title={isOpen ? "Hide sidebar" : "Show sidebar"}
        aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeft className="h-5 w-5" />
        )}
      </Button>
    );
  }

  // Mobile variant (hamburger menu)
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn("shrink-0", className)}
      title={isOpen ? "Close menu" : "Open menu"}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <X className="h-5 w-5" />
      ) : (
        <Menu className="h-5 w-5" />
      )}
    </Button>
  );
}

/**
 * Floating sidebar toggle for collapsed sidebars
 * Shows when sidebar is closed to allow reopening
 */
interface FloatingSidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  position?: "top-left" | "bottom-left";
  className?: string;
}

export function FloatingSidebarToggle({
  isOpen,
  onToggle,
  position = "top-left",
  className,
}: FloatingSidebarToggleProps) {
  if (isOpen) return null;

  const positionClasses =
    position === "top-left"
      ? "top-20 left-4"
      : "bottom-20 left-4";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      className={cn(
        "fixed z-50 h-10 w-10 rounded-full shadow-lg",
        "bg-background/95 backdrop-blur-sm",
        "hover:bg-accent",
        positionClasses,
        className
      )}
      title="Show sidebar"
      aria-label="Show sidebar"
    >
      <PanelLeft className="h-5 w-5" />
    </Button>
  );
}
