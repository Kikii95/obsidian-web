"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useDrag, usePinch } from "@use-gesture/react";
import { useSettingsStore } from "@/lib/settings-store";
import { useOptionalLayoutContext } from "@/contexts/layout-context";
import { useRouter } from "next/navigation";

interface UseGesturesOptions {
  onLongPress?: (e: { x: number; y: number }) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinch?: (scale: number) => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 0.3;
const PINCH_THRESHOLD = 0.1;

export function useGestures(options: UseGesturesOptions = {}) {
  const { settings, updateSettings } = useSettingsStore();
  const layoutContext = useOptionalLayoutContext();
  const router = useRouter();
  const initialFontSize = useRef(settings.editorFontSize);

  // Check if gestures are enabled
  const gesturesEnabled = settings.enableGestures && !options.disabled;

  // Sidebar state from layout context (if available)
  const isOpen = layoutContext?.sidebar.open ?? false;
  const toggleSidebar = layoutContext?.toggleSidebar;

  // Swipe gesture (left/right for sidebar)
  const bindDrag = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], last, cancel }) => {
      if (!gesturesEnabled) return;

      // Only process on gesture end
      if (!last) return;

      const isSwipe = Math.abs(mx) > SWIPE_THRESHOLD && Math.abs(vx) > SWIPE_VELOCITY;
      if (!isSwipe) return;

      if (dx > 0) {
        // Swipe right → Open sidebar
        if (options.onSwipeRight) {
          options.onSwipeRight();
        } else if (toggleSidebar && !isOpen) {
          toggleSidebar();
        }
      } else {
        // Swipe left → Close sidebar or go back
        if (options.onSwipeLeft) {
          options.onSwipeLeft();
        } else if (toggleSidebar && isOpen) {
          toggleSidebar();
        } else {
          router.back();
        }
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  // Pinch gesture (zoom font size)
  const bindPinch = usePinch(
    ({ offset: [scale], first, memo }) => {
      if (!gesturesEnabled) return memo;

      if (first) {
        initialFontSize.current = settings.editorFontSize;
        return initialFontSize.current;
      }

      const baseFontSize = memo || initialFontSize.current;
      const scaleDiff = scale - 1;

      if (Math.abs(scaleDiff) > PINCH_THRESHOLD) {
        // Scale font size (12-24px range)
        const newSize = Math.round(
          Math.min(24, Math.max(12, baseFontSize * scale))
        );

        if (options.onPinch) {
          options.onPinch(newSize);
        } else if (newSize !== settings.editorFontSize) {
          updateSettings({ editorFontSize: newSize });
        }
      }

      return baseFontSize;
    },
    {
      pointer: { touch: true },
      scaleBounds: { min: 0.5, max: 2 },
    }
  );

  // Long press state
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressPosition = useRef<{ x: number; y: number } | null>(null);

  // Long press handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!gesturesEnabled || !options.onLongPress) return;

      const touch = e.touches[0];
      longPressPosition.current = { x: touch.clientX, y: touch.clientY };

      longPressTimer.current = setTimeout(() => {
        if (longPressPosition.current && options.onLongPress) {
          options.onLongPress(longPressPosition.current);
        }
      }, 500);
    },
    [gesturesEnabled, options.onLongPress]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressPosition.current = null;
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if moved
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Combined bind function
  const bind = useCallback(() => {
    if (!gesturesEnabled) return {};

    return {
      ...bindDrag(),
      ...bindPinch(),
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
    };
  }, [gesturesEnabled, bindDrag, bindPinch, handleTouchStart, handleTouchEnd, handleTouchMove]);

  return {
    bind,
    bindDrag,
    bindPinch,
    gesturesEnabled,
  };
}

/**
 * Hook for sidebar swipe gestures only
 */
export function useSidebarSwipe() {
  const { settings } = useSettingsStore();
  const layoutContext = useOptionalLayoutContext();
  const isOpen = layoutContext?.sidebar.open ?? false;
  const toggleSidebar = layoutContext?.toggleSidebar;

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], last }) => {
      if (!settings.enableGestures || !toggleSidebar) return;
      if (!last) return;

      const isSwipe = Math.abs(mx) > SWIPE_THRESHOLD && Math.abs(vx) > SWIPE_VELOCITY;
      if (!isSwipe) return;

      if (dx > 0 && !isOpen) {
        toggleSidebar();
      } else if (dx < 0 && isOpen) {
        toggleSidebar();
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  return { bind };
}
