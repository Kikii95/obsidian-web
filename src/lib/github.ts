import { Octokit } from "@octokit/rest";
import type { VaultFile } from "@/types";

// ═══════════════════════════════════════════════
// VAULT CONFIG TYPE
// ═══════════════════════════════════════════════

export interface VaultConfig {
  owner: string;
  repo: string;
  branch: string;
}

// Default config from env vars (fallback for existing users)
const DEFAULT_CONFIG: VaultConfig = {
  owner: process.env.GITHUB_REPO_OWNER || "",
  repo: process.env.GITHUB_REPO_NAME || "",
  branch: process.env.GITHUB_BRANCH || "main",
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
  };
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
  const { owner, repo, branch } = getVaultConfig(config);
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
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
 */
export async function saveFileContent(
  octokit: Octokit,
  path: string,
  content: string,
  sha?: string,
  message?: string,
  config?: Partial<VaultConfig>
): Promise<{ sha: string }> {
  const { owner, repo, branch } = getVaultConfig(config);
  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: message || `Update ${path}`,
      content: Buffer.from(content).toString("base64"),
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
  const { owner, repo, branch } = getVaultConfig(config);
  try {
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
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
 * Get recursive tree for the entire vault
 * @param includeHidden - Include hidden files like .gitkeep (default false)
 */
export async function getFullVaultTree(
  octokit: Octokit,
  includeHidden: boolean = false,
  config?: Partial<VaultConfig>
): Promise<VaultFile[]> {
  const { owner, repo, branch } = getVaultConfig(config);
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref.object.sha,
      recursive: "true",
    });

    const files: VaultFile[] = tree.tree
      .filter((item) => {
        if (!item.path) return false;
        if (item.path.includes("node_modules")) return false;
        // Filter hidden files unless includeHidden is true
        // But always include .gitkeep for folder operations
        if (!includeHidden) {
          const fileName = item.path.split("/").pop() || "";
          if (fileName === ".gitkeep") {
            // Always include .gitkeep
          } else if (item.path.startsWith(".") || item.path.includes("/.")) {
            return false;
          }
        }
        return true;
      })
      .map((item) => ({
        name: item.path?.split("/").pop() || "",
        path: item.path || "",
        type: item.type === "tree" ? "dir" : "file",
        sha: item.sha,
      }));

    return files;
  } catch (error) {
    console.error("Error fetching full vault tree:", error);
    throw error;
  }
}
