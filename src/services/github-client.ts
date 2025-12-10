/**
 * GitHub API client for frontend
 * Centralizes all API calls with error handling and retry logic
 */

import type { VaultFile } from "@/types";
import { useRateLimitStore } from "@/lib/rate-limit-store";

// Rate limit info from API responses
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

interface NoteData {
  path: string;
  content: string;
  sha: string;
  frontmatter: Record<string, unknown>;
  wikilinks: string[];
  isLocked?: boolean;
}

interface GraphData {
  nodes: Array<{ id: string; name: string; path: string; linkCount: number }>;
  links: Array<{ source: string; target: string }>;
  totalNotes: number;
  connectedNotes: number;
}

interface ActivityData {
  activity: Array<{ date: string; count: number }>;
  stats: {
    totalCommits: number;
    activeDays: number;
    maxCommitsPerDay: number;
    avgCommitsPerDay: number;
    currentStreak: number;
    longestStreak: number;
    period: number;
  };
}

interface BinaryFileData {
  path: string;
  content: string; // base64
  sha: string;
  size: number;
  mimeType: string;
}

interface ApiError extends Error {
  status?: number;
}

// Base response type with optional rate limit
interface ApiResponse<T> {
  data: T;
  rateLimit?: RateLimitInfo;
}

/**
 * Update rate limit store if rate limit info is present
 */
function updateRateLimitFromResponse(data: Record<string, unknown>) {
  if (data.rateLimit && typeof data.rateLimit === "object") {
    const rl = data.rateLimit as RateLimitInfo;
    if (rl.limit && rl.remaining !== undefined && rl.reset) {
      // Update the store (only works in client context)
      if (typeof window !== "undefined") {
        useRateLimitStore.getState().setRateLimit(rl);
      }
    }
  }
}

/**
 * Base fetch wrapper with error handling and rate limit tracking
 */
async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  // Try to parse JSON, handle non-JSON responses gracefully
  let data: Record<string, unknown>;
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      // JSON parse failed even with JSON content-type
      const text = await response.text().catch(() => "Unknown error");
      const error: ApiError = new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      error.status = response.status;
      throw error;
    }
  } else {
    // Non-JSON response (rate limit, HTML error page, etc.)
    const text = await response.text().catch(() => "Unknown error");
    if (!response.ok) {
      const error: ApiError = new Error(
        response.status === 429
          ? "Rate limit exceeded. Please wait a moment."
          : `Request failed: ${text.slice(0, 100)}`
      );
      error.status = response.status;
      throw error;
    }
    // If response is OK but not JSON, treat as empty object
    data = {};
  }

  if (!response.ok) {
    const error: ApiError = new Error(data.error as string || "API request failed");
    error.status = response.status;
    throw error;
  }

  // Extract rate limit info if present
  updateRateLimitFromResponse(data);

  return data as T;
}

/**
 * GitHub API client
 */
export const githubClient = {
  /**
   * Get vault file tree
   */
  async getTree(): Promise<VaultFile[]> {
    const data = await apiFetch<{ tree: VaultFile[] }>("/api/github/tree");
    return data.tree || [];
  },

  /**
   * Get graph data (nodes + links)
   */
  async getGraph(includeOrphans = false): Promise<GraphData> {
    const url = includeOrphans
      ? "/api/github/graph?includeOrphans=true"
      : "/api/github/graph";
    return apiFetch<GraphData>(url);
  },

  /**
   * Get activity data (commits heatmap)
   */
  async getActivity(days = 365): Promise<ActivityData> {
    return apiFetch<ActivityData>(`/api/github/activity?days=${days}`);
  },

  /**
   * Read a note
   */
  async readNote(path: string): Promise<NoteData> {
    return apiFetch<NoteData>(
      `/api/github/read?path=${encodeURIComponent(path)}`
    );
  },

  /**
   * Save a note
   */
  async saveNote(
    path: string,
    content: string,
    sha: string
  ): Promise<{ sha: string }> {
    return apiFetch<{ sha: string }>("/api/github/save", {
      method: "POST",
      body: JSON.stringify({ path, content, sha }),
    });
  },

  /**
   * Create a new note (text file)
   */
  async createNote(
    path: string,
    content: string
  ): Promise<{ sha: string; path: string }> {
    return apiFetch<{ sha: string; path: string }>("/api/github/create", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    });
  },

  /**
   * Create a binary file (image, video, pdf, etc.)
   * @param path - File path
   * @param base64Content - Base64 encoded content (without data: prefix)
   */
  async createBinaryFile(
    path: string,
    base64Content: string
  ): Promise<{ sha: string; path: string }> {
    return apiFetch<{ sha: string; path: string }>("/api/github/create", {
      method: "POST",
      body: JSON.stringify({ path, content: base64Content, binary: true }),
    });
  },

  /**
   * Delete a note
   */
  async deleteNote(path: string, sha: string): Promise<void> {
    await apiFetch<{ success: boolean }>("/api/github/delete", {
      method: "DELETE",
      body: JSON.stringify({ path, sha }),
    });
  },

  /**
   * Move/rename a note
   */
  async moveNote(
    oldPath: string,
    newPath: string,
    sha: string
  ): Promise<{ sha: string; path: string }> {
    return apiFetch<{ sha: string; path: string }>("/api/github/move", {
      method: "POST",
      body: JSON.stringify({ oldPath, newPath, sha }),
    });
  },

  /**
   * Create a folder
   */
  async createFolder(path: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>("/api/github/create-folder", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  },

  /**
   * Rename a folder
   */
  async renameFolder(
    oldPath: string,
    newPath: string
  ): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>("/api/github/rename-folder", {
      method: "POST",
      body: JSON.stringify({ oldPath, newPath }),
    });
  },

  /**
   * Delete a folder
   */
  async deleteFolder(path: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>("/api/github/delete-folder", {
      method: "DELETE",
      body: JSON.stringify({ path }),
    });
  },

  /**
   * Read canvas data
   */
  async readCanvas(path: string): Promise<{
    path: string;
    data: unknown;
    sha: string;
  }> {
    return apiFetch<{ path: string; data: unknown; sha: string }>(
      `/api/github/canvas?path=${encodeURIComponent(path)}`
    );
  },

  /**
   * Save canvas data
   */
  async saveCanvas(
    path: string,
    data: unknown,
    sha: string
  ): Promise<{ sha: string }> {
    return apiFetch<{ sha: string }>("/api/github/canvas", {
      method: "POST",
      body: JSON.stringify({ path, data, sha }),
    });
  },

  /**
   * Read a binary file (image, PDF, etc.)
   */
  async readBinaryFile(path: string): Promise<BinaryFileData> {
    return apiFetch<BinaryFileData>(
      `/api/github/binary?path=${encodeURIComponent(path)}`
    );
  },
};

/**
 * Export types for consumers
 */
export type { NoteData, GraphData, BinaryFileData, ApiError };
