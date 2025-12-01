"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSettingsStore } from "@/lib/settings-store";

/**
 * Hook to sync settings with GitHub cloud on app start.
 * Call this once in a top-level layout component.
 */
export function useSettingsSync() {
  const { status } = useSession();
  const { loadFromCloud, saveToCloud, settings, isSyncing } = useSettingsStore();
  const hasLoadedRef = useRef(false);
  const lastSettingsRef = useRef<string>("");

  // Load settings from cloud on first authenticated mount
  useEffect(() => {
    if (status === "authenticated" && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadFromCloud();
    }
  }, [status, loadFromCloud]);

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
