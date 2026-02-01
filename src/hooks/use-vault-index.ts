"use client";

import { useState, useCallback, useRef } from "react";

interface IndexStatus {
  status: "none" | "pending" | "indexing" | "completed" | "failed";
  hasIndex: boolean;
  totalFiles: number;
  indexedFiles: number;
  failedFiles: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage?: string;
}

interface FileToIndex {
  path: string;
  name: string;
  sha: string;
}

const BATCH_SIZE = 10;

export function useVaultIndex() {
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState({ indexed: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/vault/index/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching index status:", error);
    }
    return null;
  }, []);

  const processBatch = async (
    files: FileToIndex[],
    totalFiles: number,
    currentIndex: number,
    signal: AbortSignal
  ): Promise<{ indexed: number; failed: number }> => {
    const response = await fetch("/api/vault/index/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files,
        totalFiles,
        currentIndex,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error("Batch processing failed");
    }

    return response.json();
  };

  const startIndexing = useCallback(async (rebuild = false) => {
    if (isIndexing) return;

    setIsIndexing(true);
    setProgress({ indexed: 0, total: 0 });
    abortControllerRef.current = new AbortController();

    try {
      // Start indexation
      const startResponse = await fetch("/api/vault/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rebuild }),
        signal: abortControllerRef.current.signal,
      });

      if (!startResponse.ok) {
        throw new Error("Failed to start indexation");
      }

      const startData = await startResponse.json();

      if (startData.status === "already_indexing") {
        setProgress({
          indexed: startData.progress.indexed,
          total: startData.progress.total,
        });
        // Continue polling status
        await pollStatus();
        return;
      }

      const files: FileToIndex[] = startData.files;
      const totalFiles = startData.totalFiles;
      setProgress({ indexed: 0, total: totalFiles });

      // Process in batches
      let currentIndex = 0;
      while (currentIndex < files.length) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const batch = files.slice(currentIndex, currentIndex + BATCH_SIZE);
        const result = await processBatch(
          batch,
          totalFiles,
          currentIndex,
          abortControllerRef.current.signal
        );

        currentIndex += batch.length;
        setProgress((prev) => ({
          ...prev,
          indexed: currentIndex,
        }));

        // Update status periodically
        if (result.isComplete) {
          await fetchStatus();
          break;
        }
      }

      // Final status update
      await fetchStatus();
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Indexation error:", error);
      }
    } finally {
      setIsIndexing(false);
      abortControllerRef.current = null;
    }
  }, [isIndexing, fetchStatus]);

  const pollStatus = useCallback(async () => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const currentStatus = await fetchStatus();
      if (!currentStatus || currentStatus.status !== "indexing") {
        break;
      }
      setProgress({
        indexed: currentStatus.indexedFiles,
        total: currentStatus.totalFiles,
      });
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5s
      attempts++;
    }
  }, [fetchStatus]);

  const cancelIndexing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsIndexing(false);
    }
  }, []);

  const updateSingleFile = useCallback(
    async (path: string, name: string, sha: string, content: string) => {
      try {
        const response = await fetch("/api/vault/index/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, name, sha, content }),
        });

        if (!response.ok) {
          throw new Error("Failed to update file index");
        }

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

      if (!response.ok) {
        throw new Error("Failed to delete file from index");
      }

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
    fetchStatus,
    startIndexing,
    cancelIndexing,
    updateSingleFile,
    deleteFile,
  };
}
