import { Octokit } from "@octokit/rest";
import type { VaultFile } from "@/types";

const REPO_OWNER = process.env.GITHUB_REPO_OWNER!;
const REPO_NAME = process.env.GITHUB_REPO_NAME!;
const BRANCH = process.env.GITHUB_BRANCH || "master";

export function createOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

/**
 * Get the file tree of the vault
 */
export async function getVaultTree(
  octokit: Octokit,
  path: string = ""
): Promise<VaultFile[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
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
  path: string
): Promise<{ content: string; sha: string }> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
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
  message?: string
): Promise<{ sha: string }> {
  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      message: message || `Update ${path}`,
      content: Buffer.from(content).toString("base64"),
      sha,
      branch: BRANCH,
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
  message?: string
): Promise<void> {
  try {
    await octokit.repos.deleteFile({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      message: message || `Delete ${path}`,
      sha,
      branch: BRANCH,
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
  message?: string
): Promise<{ sha: string }> {
  return saveFileContent(octokit, path, content, undefined, message || `Create ${path}`);
}

/**
 * Search files in the vault
 */
export async function searchInVault(
  octokit: Octokit,
  query: string
): Promise<{ path: string; name: string }[]> {
  try {
    const { data } = await octokit.search.code({
      q: `${query} repo:${REPO_OWNER}/${REPO_NAME}`,
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
 */
export async function getFullVaultTree(
  octokit: Octokit
): Promise<VaultFile[]> {
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
    });

    const { data: tree } = await octokit.git.getTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree_sha: ref.object.sha,
      recursive: "true",
    });

    const files: VaultFile[] = tree.tree
      .filter((item) => {
        if (!item.path) return false;
        if (item.path.startsWith(".")) return false;
        if (item.path.includes("/.")) return false;
        if (item.path.includes("node_modules")) return false;
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
