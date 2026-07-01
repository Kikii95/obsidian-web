"use client";

import { useCallback } from "react";
import { useIndexingStore } from "@/lib/indexing-store";

export type { LastRefreshStats } from "@/lib/indexing-store";

/**
 * Vault index controls. Backed by the global `useIndexingStore` so indexing
 * runs in the BACKGROUND: the loop lives outside React and progress survives
 * navigating away from the settings page. Single-file updates stay local.
 */
export function useVaultIndex() {
  const status = useIndexingStore((state) => state.status);
  const isIndexing = useIndexingStore((state) => state.isIndexing);
  const progress = useIndexingStore((state) => state.progress);
  const lastRefreshStats = useIndexingStore((state) => state.lastRefreshStats);
  const fetchStatus = useIndexingStore((state) => state.fetchStatus);
  const startIndexing = useIndexingStore((state) => state.start);
  const cancelIndexing = useIndexingStore((state) => state.cancel);

  const updateSingleFile = useCallback(
    async (path: string, name: string, sha: string, content: string) => {
      try {
        const response = await fetch("/api/vault/index/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, name, sha, content }),
        });
        if (!response.ok) throw new Error("Failed to update file index");
        return response.json();
      } catch (error) {
        console.error("Error updating file index:", error);
        return null;
      }
    },
    []
  );

  const deleteFile = useCallback(async (path: string) => {
    try {
      const response = await fetch("/api/vault/index/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, deleted: true }),
      });
      if (!response.ok) throw new Error("Failed to delete file from index");
      return response.json();
    } catch (error) {
      console.error("Error deleting file from index:", error);
      return null;
    }
  }, []);

  return {
    status,
    isIndexing,
    progress,
    lastRefreshStats,
    fetchStatus,
    startIndexing,
    cancelIndexing,
    updateSingleFile,
    deleteFile,
  };
}
