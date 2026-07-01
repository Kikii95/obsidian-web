"use client";

import { create } from "zustand";

const BATCH_SIZE = 10;
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 240; // 20 min ceiling for the "another tab is indexing" case
const POLL_STALL_LIMIT = 12; // ~60s without progress → treat the run as dead
const BATCH_RETRY_ATTEMPTS = 3;
const BATCH_RETRY_BASE_MS = 800;

export interface IndexStatus {
  status: "none" | "pending" | "indexing" | "completed" | "failed";
  hasIndex: boolean;
  totalFiles: number;
  indexedFiles: number;
  failedFiles: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage?: string;
}

export interface FileToIndex {
  path: string;
  name: string;
  sha: string;
}

export interface LastRefreshStats {
  mode: "refresh" | "rebuild";
  totalFiles: number;
  newFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
  unchangedFiles: number;
  timestamp: string;
  wasUpToDate: boolean;
}

export type IndexPhase = "idle" | "planning" | "indexing" | "completed" | "error";

interface Progress {
  indexed: number;
  total: number;
}

interface IndexingStore {
  phase: IndexPhase;
  isIndexing: boolean;
  progress: Progress;
  status: IndexStatus | null;
  lastRefreshStats: LastRefreshStats | null;
  error: string | null;
  completedAt: number | null;
  dismissed: boolean;
  fetchStatus: () => Promise<IndexStatus | null>;
  start: (rebuild?: boolean) => Promise<void>;
  cancel: () => void;
  dismiss: () => void;
  hydrate: () => Promise<void>;
}

type SetIndexing = (partial: Partial<IndexingStore>) => void;

// Kept outside React state: the loop must survive component unmounts.
let abortController: AbortController | null = null;
let hydrating = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchIndexStatus(): Promise<IndexStatus | null> {
  try {
    const response = await fetch("/api/vault/index/status");
    if (response.ok) return (await response.json()) as IndexStatus;
  } catch (error) {
    console.error("Error fetching index status:", error);
  }
  return null;
}

async function postBatch(
  files: FileToIndex[],
  totalFiles: number,
  currentIndex: number,
  signal: AbortSignal
): Promise<{ isComplete: boolean }> {
  const response = await fetch("/api/vault/index/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files, totalFiles, currentIndex }),
    signal,
  });
  if (!response.ok) throw new Error("Batch processing failed");
  return response.json();
}

type PlanResult =
  | { kind: "already_indexing"; progress: Progress }
  | { kind: "up_to_date"; stats: LastRefreshStats }
  | { kind: "run"; files: FileToIndex[]; stats: LastRefreshStats };

async function planIndexing(rebuild: boolean, signal: AbortSignal): Promise<PlanResult> {
  const response = await fetch("/api/vault/index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rebuild }),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Échec du démarrage de l'indexation");
  }
  const data = await response.json();
  if (data.status === "already_indexing") {
    return {
      kind: "already_indexing",
      progress: { indexed: data.progress.indexed, total: data.progress.total },
    };
  }
  const stats: LastRefreshStats = {
    mode: data.mode || "refresh",
    totalFiles: data.totalFiles ?? 0,
    newFiles: data.newFiles ?? 0,
    modifiedFiles: data.modifiedFiles ?? 0,
    deletedFiles: data.deletedFiles ?? 0,
    unchangedFiles: data.unchangedFiles ?? 0,
    timestamp: new Date().toISOString(),
    wasUpToDate: data.status === "completed" && data.mode === "refresh",
  };
  if (data.status === "completed" && data.mode === "refresh") {
    return { kind: "up_to_date", stats };
  }
  return { kind: "run", files: (data.files as FileToIndex[]) ?? [], stats };
}

// Retry a batch across transient failures (serverless cold start, 504, network)
// so one blip doesn't abort the whole run.
async function postBatchWithRetry(
  files: FileToIndex[],
  totalFiles: number,
  currentIndex: number,
  signal: AbortSignal
): Promise<{ isComplete: boolean }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < BATCH_RETRY_ATTEMPTS; attempt += 1) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await postBatch(files, totalFiles, currentIndex, signal);
    } catch (error) {
      if (isAbortError(error)) throw error;
      lastError = error;
      await delay(BATCH_RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Batch processing failed");
}

async function runBatches(
  files: FileToIndex[],
  signal: AbortSignal,
  onProgress: (indexed: number) => void
): Promise<void> {
  let index = 0;
  while (index < files.length) {
    if (signal.aborted) return;
    const batch = files.slice(index, index + BATCH_SIZE);
    const result = await postBatchWithRetry(batch, files.length, index, signal);
    index += batch.length;
    onProgress(index);
    if (result.isComplete) return;
  }
}

async function pollUntilDone(signal: AbortSignal, set: SetIndexing): Promise<void> {
  let lastIndexed = -1;
  let stalls = 0;
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    if (signal.aborted) return;
    const status = await fetchIndexStatus();
    if (!status || status.status !== "indexing") return;
    set({ progress: { indexed: status.indexedFiles, total: status.totalFiles } });
    if (status.indexedFiles > lastIndexed) {
      lastIndexed = status.indexedFiles;
      stalls = 0;
    } else if ((stalls += 1) >= POLL_STALL_LIMIT) {
      return; // no progress for a while → dead run, stop polling
    }
    await delay(POLL_INTERVAL_MS);
  }
}

function finish(set: SetIndexing, status: IndexStatus | null): void {
  const failed = status?.status === "failed";
  const partial: Partial<IndexingStore> = {
    isIndexing: false,
    phase: failed ? "error" : "completed",
    completedAt: Date.now(),
    error: failed ? status?.errorMessage ?? "Indexation échouée" : null,
  };
  if (status) partial.status = status;
  set(partial);
}

/** Run the plan returned by the server: poll, no-op, or batch through the files. */
async function applyPlan(
  plan: PlanResult,
  signal: AbortSignal,
  set: SetIndexing,
  refreshStatus: () => Promise<IndexStatus | null>
): Promise<void> {
  if (plan.kind === "already_indexing") {
    set({ progress: plan.progress });
    await pollUntilDone(signal, set);
    if (signal.aborted) return;
    const status = await refreshStatus();
    if (status?.status === "indexing") {
      // The concurrent run stalled — go idle so a retry can restart it via the
      // server's stale-lock recovery, instead of faking a completion.
      set({ isIndexing: false, phase: "idle" });
      return;
    }
    finish(set, status);
    return;
  }
  if (plan.kind === "up_to_date") {
    set({ lastRefreshStats: plan.stats });
    finish(set, await refreshStatus());
    return;
  }
  set({
    lastRefreshStats: plan.stats,
    phase: "indexing",
    progress: { indexed: 0, total: plan.files.length },
  });
  await runBatches(plan.files, signal, (indexed) =>
    set({ progress: { indexed, total: plan.files.length } })
  );
  if (signal.aborted) {
    set({ isIndexing: false, phase: "idle" });
    return;
  }
  finish(set, await refreshStatus());
}

export const useIndexingStore = create<IndexingStore>((set, get) => ({
  phase: "idle",
  isIndexing: false,
  progress: { indexed: 0, total: 0 },
  status: null,
  lastRefreshStats: null,
  error: null,
  completedAt: null,
  dismissed: false,

  fetchStatus: async () => {
    const status = await fetchIndexStatus();
    if (status) set({ status });
    return status;
  },

  start: async (rebuild = false) => {
    if (get().isIndexing) return;
    const controller = new AbortController();
    abortController = controller;
    set({
      isIndexing: true,
      phase: "planning",
      error: null,
      progress: { indexed: 0, total: 0 },
      lastRefreshStats: null,
      dismissed: false,
      completedAt: null,
    });

    try {
      const plan = await planIndexing(rebuild, controller.signal);
      await applyPlan(plan, controller.signal, set, get().fetchStatus);
    } catch (error) {
      if (isAbortError(error)) {
        set({ isIndexing: false, phase: "idle" });
        return;
      }
      console.error("Indexation error:", error);
      set({
        isIndexing: false,
        phase: "error",
        error: error instanceof Error ? error.message : "Erreur d'indexation",
      });
    } finally {
      if (abortController === controller) abortController = null;
    }
  },

  cancel: () => {
    abortController?.abort();
    set({ isIndexing: false, phase: "idle" });
  },

  dismiss: () => set({ dismissed: true }),

  hydrate: async () => {
    if (get().isIndexing || hydrating) return;
    hydrating = true;
    try {
      const status = await get().fetchStatus();
      // A DB status still on "indexing" is either a live run elsewhere or a dead
      // lock. Re-plan through start(): the server resumes a fresh run (we poll)
      // or, if the lock is stale, restarts it — so a dead run never traps the
      // vault (the old code just polled it forever, blocking the Refresh button).
      if (status?.status === "indexing") await get().start(false);
    } finally {
      hydrating = false;
    }
  },
}));
