"use client";

import { useState, useEffect } from "react";

interface PwaPromptState {
  showPrompt: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  dismiss: () => void;
}

/**
 * Hook to manage iOS "Add to Home Screen" prompt
 * Shows prompt on iOS Safari when not in standalone mode
 * Remembers dismissal for 7 days
 */
export function usePwaPrompt(): PwaPromptState {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Detect standalone mode (PWA installed)
    const standalone =
      // iOS standalone check
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      // Standard standalone check
      window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Detect iOS device
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Don't show prompt if:
    // - Already in standalone mode (PWA installed)
    // - Not on iOS (other platforms have different install flows)
    if (standalone || !isIOSDevice) return;

    // Check if user dismissed recently (within 7 days)
    const dismissedTimestamp = localStorage.getItem("pwa-prompt-dismissed");
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (dismissedTimestamp && now - parseInt(dismissedTimestamp, 10) < sevenDaysMs) {
      return;
    }

    // Show prompt after short delay (let page load first)
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  return { showPrompt, isStandalone, isIOS, dismiss };
}
