import { Octokit } from "@octokit/rest";
import type { VaultFile } from "@/types";
import {
  toVaultFiles,
  walkTreeByDirectory,
  type RawTreeEntry,
} from "@/lib/github-tree";

// ═══════════════════════════════════════════════
// VAULT CONFIG TYPE
// ═══════════════════════════════════════════════

export interface VaultConfig {
  owner: string;
  repo: string;
  branch: string;
  rootPath?: string; // Optional: if vault is in a subdirectory (e.g., "vault")
}

// Default config from env vars (fallback for existing users)
const DEFAULT_CONFIG: VaultConfig = {
  owner: process.env.GITHUB_REPO_OWNER || "",
  repo: process.env.GITHUB_REPO_NAME || "",
  branch: process.env.GITHUB_BRANCH || "main",
  rootPath: process.env.GITHUB_ROOT_PATH || "",
};

/**
 * Get vault config from various sources (priority order):
 * 1. Explicit config parameter
 * 2. Environment variables (default)
 */
export function getVaultConfig(config?: Partial<VaultConfig>): VaultConfig {
  return {
    owner: config?.owner || DEFAULT_CONFIG.owner,
    repo: config?.repo || DEFAULT_CONFIG.repo,
    branch: config?.branch || DEFAULT_CONFIG.branch,
    rootPath: config?.rootPath ?? DEFAULT_CONFIG.rootPath,
  };
}

/**
 * Helper to prepend rootPath to a file path
 */
export function withRootPath(path: string, config?: Partial<VaultConfig>): string {
  const { rootPath } = getVaultConfig(config);
  if (!rootPath) return path;
  // Don't prepend if path already starts with rootPath
  if (path.startsWith(rootPath + "/") || path === rootPath) return path;
  return `${rootPath}/${path}`;
}

/**
 * Helper to remove rootPath from a file path (for display)
 */
export function withoutRootPath(path: string, config?: Partial<VaultConfig>): string {
  const { rootPath } = getVaultConfig(config);
  if (!rootPath) return path;
  if (path.startsWith(rootPath + "/")) {
    return path.slice(rootPath.length + 1);
  }
  return path;
}

// Rate limit info type
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

// Last rate limit from any API call
let lastRateLimit: RateLimitInfo | null = null;

export function createOctokit(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken });

  // Hook into all responses to track rate limits
  octokit.hook.after("request", async (response) => {
    const headers = response.headers;
    if (headers["x-ratelimit-limit"]) {
      lastRateLimit = {
        limit: parseInt(headers["x-ratelimit-limit"] as string, 10),
        remaining: parseInt(headers["x-ratelimit-remaining"] as string, 10),
        reset: parseInt(headers["x-ratelimit-reset"] as string, 10),
        used: parseInt(headers["x-ratelimit-used"] as string || "0", 10),
      };
    }
  });

  return octokit;
}

/**
 * Create unauthenticated Octokit for public repos
 * Rate limit: 60 req/hour per IP (vs 5000 authenticated)
 */
export function createPublicOctokit() {
  const octokit = new Octokit();

  // Hook into all responses to track rate limits
  octokit.hook.after("request", async (response) => {
    const headers = response.headers;
    if (headers["x-ratelimit-limit"]) {
      lastRateLimit = {
        limit: parseInt(headers["x-ratelimit-limit"] as string, 10),
        remaining: parseInt(headers["x-ratelimit-remaining"] as string, 10),
        reset: parseInt(headers["x-ratelimit-reset"] as string, 10),
        used: parseInt(headers["x-ratelimit-used"] as string || "0", 10),
      };
    }
  });

  return octokit;
}

// Get the last captured rate limit
export function getLastRateLimit(): RateLimitInfo | null {
  return lastRateLimit;
}

/**
 * Get the file tree of the vault
 */
export async function getVaultTree(
  octokit: Octokit,
  path: string = "",
  config?: Partial<VaultConfig>
): Promise<VaultFile[]> {
  const { owner, repo, branch } = getVaultConfig(config);
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!Array.isArray(data)) {
      return [];
    }

    const files: VaultFile[] = data
      .filter((item) => {
        // Filter out hidden files and .obsidian folder
        if (item.name.startsWith(".")) return false;
        if (item.name === "node_modules") return false;
        return true;
      })
      .map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as "file" | "dir",
        sha: item.sha,
      }));

    return files;
  } catch (error) {
    console.error("Error fetching vault tree:", error);
    throw error;
  }
}

/**
 * Get file content from the vault
 */
export async function getFileContent(
  octokit: Octokit,
  path: string,
  config?: Partial<VaultConfig>
): Promise<{ content: string; sha: string }> {
  const { owner, repo, branch, rootPath } = getVaultConfig(config);
  const fullPath = rootPath ? withRootPath(path, config) : path;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: fullPath,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new Error("Path is not a file");
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return { content, sha: data.sha };
  } catch (error) {
    console.error("Error fetching file content:", error);
    throw error;
  }
}

/**
 * Save file content to the vault (create or update)
 * @param encoding - If "base64", content is already base64 encoded (for binary files)
 */
export async function saveFileContent(
  octokit: Octokit,
  path: string,
  content: string,
  sha?: string,
  message?: string,
  config?: Partial<VaultConfig>,
  encoding?: "utf-8" | "base64"
): Promise<{ sha: string }> {
  const { owner, repo, branch, rootPath } = getVaultConfig(config);
  const fullPath = rootPath ? withRootPath(path, config) : path;
  try {
    // If content is already base64 encoded (for images/binary), use it directly
    // Otherwise, encode the UTF-8 string content to base64
    const base64Content = encoding === "base64"
      ? content
      : Buffer.from(content).toString("base64");

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: fullPath,
      message: message || `Update ${path}`,
      content: base64Content,
      sha,
      branch,
    });

    return { sha: data.content?.sha || "" };
  } catch (error) {
    console.error("Error saving file:", error);
    throw error;
  }
}

/**
 * Delete a file from the vault
 */
export async function deleteFile(
  octokit: Octokit,
  path: string,
  sha: string,
  message?: string,
  config?: Partial<VaultConfig>
): Promise<void> {
  const { owner, repo, branch, rootPath } = getVaultConfig(config);
  const fullPath = rootPath ? withRootPath(path, config) : path;
  try {
    await octokit.repos.deleteFile({
      owner,
      repo,
      path: fullPath,
      message: message || `Delete ${path}`,
      sha,
      branch,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

/**
 * Create a new file in the vault
 */
export async function createFile(
  octokit: Octokit,
  path: string,
  content: string,
  message?: string,
  config?: Partial<VaultConfig>
): Promise<{ sha: string }> {
  return saveFileContent(octokit, path, content, undefined, message || `Create ${path}`, config);
}

/**
 * Search files in the vault
 */
export async function searchInVault(
  octokit: Octokit,
  query: string,
  config?: Partial<VaultConfig>
): Promise<{ path: string; name: string }[]> {
  const { owner, repo } = getVaultConfig(config);
  try {
    const { data } = await octokit.search.code({
      q: `${query} repo:${owner}/${repo}`,
      per_page: 20,
    });

    return data.items.map((item) => ({
      path: item.path,
      name: item.name,
    }));
  } catch (error) {
    console.error("Error searching vault:", error);
    throw error;
  }
}

/**
 * Get the full tree for the entire vault.
 *
 * Uses the recursive Git Trees API for speed, but detects GitHub's `truncated`
 * flag (set for large repos, ~100k entries / 7MB) and falls back to a
 * directory-by-directory walk so the ENTIRE vault is always covered.
 *
 * @param includeHidden - Include hidden files like .gitkeep (default false)
 */
export async function getFullVaultTree(
  octokit: Octokit,
  includeHidden: boolean = false,
  config?: Partial<VaultConfig>
): Promise<VaultFile[]> {
  const { owner, repo, branch, rootPath } = getVaultConfig(config);
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const rootSha = ref.object.sha;

    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: rootSha,
      recursive: "true",
    });

    let raw: RawTreeEntry[];
    if (tree.truncated) {
      console.warn(
        "[github] Recursive tree truncated for %s/%s — walking per-directory to cover the whole vault",
        owner,
        repo
      );
      raw = await walkTreeByDirectory(octokit, owner, repo, rootSha, rootPath);
    } else {
      raw = [];
      for (const item of tree.tree) {
        if (!item.path || !item.sha) continue;
        raw.push({
          path: item.path,
          type: item.type === "tree" ? "tree" : "blob",
          sha: item.sha,
        });
      }
    }

    return toVaultFiles(raw, rootPath, includeHidden);
  } catch (error) {
    console.error("Error fetching full vault tree:", error);
    throw error;
  }
}
