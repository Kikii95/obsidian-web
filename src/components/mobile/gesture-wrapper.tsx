"use client";

import { type ReactNode, useCallback, useState } from "react";
import { useGestures } from "@/hooks/use-gestures";
import { cn } from "@/lib/utils";

interface GestureWrapperProps {
  children: ReactNode;
  className?: string;
  /**
   * Enable/disable gestures for this wrapper
   * @default true
   */
  enabled?: boolean;
  /**
   * Custom swipe left handler
   */
  onSwipeLeft?: () => void;
  /**
   * Custom swipe right handler
   */
  onSwipeRight?: () => void;
  /**
   * Custom pinch handler (scale factor)
   */
  onPinch?: (scale: number) => void;
  /**
   * Custom long press handler
   */
  onLongPress?: (e: { x: number; y: number }) => void;
}

/**
 * Wrapper component that adds mobile gesture support
 * - Swipe left/right for navigation
 * - Pinch to zoom (font size)
 * - Long press for context menu
 */
export function GestureWrapper({
  children,
  className,
  enabled = true,
  onSwipeLeft,
  onSwipeRight,
  onPinch,
  onLongPress,
}: GestureWrapperProps) {
  const { bind, gesturesEnabled } = useGestures({
    onSwipeLeft,
    onSwipeRight,
    onPinch,
    onLongPress,
    disabled: !enabled,
  });

  // If gestures are disabled globally, just render children
  if (!gesturesEnabled && !enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      {...bind()}
      className={cn("touch-pan-y", className)}
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </div>
  );
}

/**
 * Simple gesture zone without context menu
 */
export function GestureZone({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
}: {
  children: ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const { bind } = useGestures({
    onSwipeLeft,
    onSwipeRight,
  });

  return (
    <div {...bind()} className={cn("touch-pan-y", className)}>
      {children}
    </div>
  );
}
