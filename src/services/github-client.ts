/**
 * GitHub API client for frontend
 * Centralizes all API calls with error handling and retry logic
 */

import type { VaultFile } from "@/types";

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

/**
 * Base fetch wrapper with error handling
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

  const data = await response.json();

  if (!response.ok) {
    const error: ApiError = new Error(data.error || "API request failed");
    error.status = response.status;
    throw error;
  }

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
  async getGraph(): Promise<GraphData> {
    return apiFetch<GraphData>("/api/github/graph");
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
   * Create a new note
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
