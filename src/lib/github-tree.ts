import type { Octokit } from "@octokit/rest";
import type { VaultFile } from "@/types";

/**
 * Tree walking for the vault. GitHub's recursive Git Trees API silently
 * truncates for large repos (~100k entries / 7MB) and sets `truncated: true`.
 * When that happens we fall back to a directory-by-directory walk so no file
 * is ever dropped from the index.
 */

export interface RawTreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

// Directories never worth descending into during the fallback walk.
const SKIP_DIRS = new Set(["node_modules", ".git"]);

/** Only descend into directories that can contain wanted files. */
function shouldWalkInto(dirPath: string, rootPath?: string): boolean {
  const name = dirPath.split("/").pop() || "";
  if (SKIP_DIRS.has(name)) return false;
  if (!rootPath) return true;
  return (
    dirPath === rootPath ||
    dirPath.startsWith(rootPath + "/") ||
    rootPath.startsWith(dirPath + "/")
  );
}

/**
 * Fallback used when the recursive tree is truncated: BFS the tree one
 * directory at a time (non-recursive getTree per subtree), building full paths.
 */
export async function walkTreeByDirectory(
  octokit: Octokit,
  owner: string,
  repo: string,
  rootSha: string,
  rootPath?: string
): Promise<RawTreeEntry[]> {
  const entries: RawTreeEntry[] = [];
  const queue: Array<{ sha: string; prefix: string }> = [{ sha: rootSha, prefix: "" }];

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const { data } = await octokit.git.getTree({ owner, repo, tree_sha: next.sha });
    for (const item of data.tree) {
      if (!item.path || !item.sha) continue;
      const fullPath = next.prefix ? `${next.prefix}/${item.path}` : item.path;
      if (item.type === "tree") {
        entries.push({ path: fullPath, type: "tree", sha: item.sha });
        if (shouldWalkInto(fullPath, rootPath)) {
          queue.push({ sha: item.sha, prefix: fullPath });
        }
      } else if (item.type === "blob") {
        entries.push({ path: fullPath, type: "blob", sha: item.sha });
      }
    }
  }
  return entries;
}

/** A path is hidden if any segment (relative to rootPath) starts with a dot. */
function isHiddenPath(path: string, rootPath?: string): boolean {
  const fileName = path.split("/").pop() || "";
  if (fileName === ".gitkeep") return false;
  let relative = path;
  if (rootPath && relative.startsWith(rootPath + "/")) {
    relative = relative.slice(rootPath.length + 1);
  }
  return relative.startsWith(".") || relative.includes("/.");
}

/** Apply the vault filters (rootPath scope, hidden files) and map to VaultFile. */
export function toVaultFiles(
  entries: RawTreeEntry[],
  rootPath: string | undefined,
  includeHidden: boolean
): VaultFile[] {
  return entries
    .filter((item) => {
      if (!item.path) return false;
      if (item.path.includes("node_modules")) return false;
      if (rootPath && !item.path.startsWith(rootPath + "/") && item.path !== rootPath) {
        return false;
      }
      if (!includeHidden && isHiddenPath(item.path, rootPath)) return false;
      return true;
    })
    .map((item) => {
      let displayPath = item.path;
      if (rootPath && displayPath.startsWith(rootPath + "/")) {
        displayPath = displayPath.slice(rootPath.length + 1);
      }
      return {
        name: item.path.split("/").pop() || "",
        path: displayPath,
        type: (item.type === "tree" ? "dir" : "file") as "file" | "dir",
        sha: item.sha,
      };
    })
    .filter((item) => item.path !== "");
}
