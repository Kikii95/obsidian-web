"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSettingsStore } from "@/lib/settings-store";

/**
 * Hook to sync settings with GitHub cloud on app start.
 * Also reloads settings when tab becomes visible (to sync changes from other devices).
 * Call this once in a top-level layout component.
 */
export function useSettingsSync() {
  const { status } = useSession();
  const { loadFromCloud, saveToCloud, settings, isSyncing } = useSettingsStore();
  const hasLoadedRef = useRef(false);
  const lastSettingsRef = useRef<string>("");
  const lastSyncTimeRef = useRef<number>(0);

  // Min interval between reloads (5 minutes)
  const MIN_RELOAD_INTERVAL = 5 * 60 * 1000;

  // Reload settings from cloud (throttled)
  const reloadFromCloud = useCallback(() => {
    if (!settings.syncToCloud || isSyncing) return;

    const now = Date.now();
    if (now - lastSyncTimeRef.current < MIN_RELOAD_INTERVAL) return;

    lastSyncTimeRef.current = now;
    loadFromCloud();
  }, [settings.syncToCloud, isSyncing, loadFromCloud]);

  // Load settings from cloud on first authenticated mount
  useEffect(() => {
    if (status === "authenticated" && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      lastSyncTimeRef.current = Date.now();
      loadFromCloud();
    }
  }, [status, loadFromCloud]);

  // Reload settings when tab becomes visible (sync from other devices)
  useEffect(() => {
    if (status !== "authenticated") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reloadFromCloud();
      }
    };

    const handleFocus = () => {
      reloadFromCloud();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [status, reloadFromCloud]);

  // Auto-save to cloud when settings change (debounced)
  useEffect(() => {
    if (!settings.syncToCloud || isSyncing || !hasLoadedRef.current) return;

    const settingsJson = JSON.stringify(settings);

    // Skip if settings haven't actually changed
    if (settingsJson === lastSettingsRef.current) return;
    lastSettingsRef.current = settingsJson;

    // Debounce save to avoid too many API calls
    const timeout = setTimeout(() => {
      saveToCloud();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeout);
  }, [settings, saveToCloud, isSyncing]);

  return { isSyncing };
}
