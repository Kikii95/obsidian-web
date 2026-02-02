import type { VaultFile } from "@/types";

/**
 * Sort tree items: directories first, then alphabetically
 */
export function sortTreeItems(items: VaultFile[]): VaultFile[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

/**
 * File category for icon/color mapping
 */
export type FileCategory =
  | "markdown"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "canvas"
  | "code"
  | "archive"
  | "unknown";

/**
 * Detect file category from filename extension
 */
export function getFileCategory(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (ext === "md") return "markdown";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext))
    return "image";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  if (ext === "canvas") return "canvas";
  if (
    ["js", "ts", "tsx", "jsx", "py", "json", "yaml", "yml", "html", "css"].includes(ext)
  )
    return "code";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "archive";

  return "unknown";
}

/**
 * Get parent path from a file path
 */
export function getParentPath(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

/**
 * Get filename from a path
 */
export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

/**
 * Join path segments
 */
export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join("/");
}

/**
 * Check if a file is viewable (not hidden, not system file)
 */
export function isViewableFile(file: VaultFile): boolean {
  // Hide hidden files (starting with .)
  if (file.name.startsWith(".")) return false;

  // For directories, always show
  if (file.type === "dir") return true;

  // Show common viewable extensions
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const viewableExts = [
    // Text
    "md",
    "txt",
    "json",
    "yaml",
    "yml",
    "xml",
    "html",
    "css",
    "js",
    "ts",
    "tsx",
    "jsx",
    // Images
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
    // Video
    "mp4",
    "webm",
    "mov",
    "avi",
    "mkv",
    // Audio
    "mp3",
    "wav",
    "ogg",
    "m4a",
    "flac",
    // Documents
    "pdf",
    // Obsidian
    "canvas",
  ];

  return viewableExts.includes(ext);
}

/**
 * Filter tree items by search query and viewability
 */
export function filterTreeItems(
  items: VaultFile[],
  filter: string,
  checkViewable = true
): VaultFile[] {
  if (!filter && !checkViewable) return items;

  const lowerFilter = filter.toLowerCase();

  return items.filter((item) => {
    // For directories, check if any children match
    if (item.type === "dir") {
      const filteredChildren = filterTreeItems(
        item.children || [],
        filter,
        checkViewable
      );
      // Keep dir if it matches filter or has matching children
      const dirMatches =
        !filter || item.name.toLowerCase().includes(lowerFilter);
      return filteredChildren.length > 0 || dirMatches;
    }

    // For files
    const matchesFilter =
      !filter || item.name.toLowerCase().includes(lowerFilter);
    const matchesViewable = !checkViewable || isViewableFile(item);

    return matchesFilter && matchesViewable;
  });
}

/**
 * Build a tree structure from flat file list
 * Takes a flat array of VaultFile and returns nested tree with children
 */
export function buildTree(
  files: VaultFile[],
  isPathLocked?: (path: string) => boolean
): VaultFile[] {
  const root: VaultFile[] = [];
  const map = new Map<string, VaultFile>();

  // Helper to ensure all parent directories exist
  const ensureParents = (path: string) => {
    const parts = path.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map.has(currentPath)) {
        const dirNode: VaultFile = {
          name: part,
          path: currentPath,
          type: "dir",
          children: [],
          isLocked: isPathLocked?.(currentPath) ?? false,
        };

        if (parentPath === "") {
          root.push(dirNode);
        } else {
          const parent = map.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(dirNode);
          }
        }

        map.set(currentPath, dirNode);
      }
    }
  };

  // First pass: create all directories
  for (const file of files) {
    if (file.type === "dir") {
      ensureParents(file.path + "/dummy"); // Ensure parent dirs exist
      if (!map.has(file.path)) {
        const parts = file.path.split("/");
        const dirNode: VaultFile = {
          name: file.name,
          path: file.path,
          type: "dir",
          children: [],
          isLocked: file.isLocked ?? isPathLocked?.(file.path) ?? false,
        };

        if (parts.length === 1) {
          root.push(dirNode);
        } else {
          const parentPath = parts.slice(0, -1).join("/");
          const parent = map.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(dirNode);
          }
        }

        map.set(file.path, dirNode);
      }
    }
  }

  // Second pass: add all files
  for (const file of files) {
    if (file.type === "file") {
      const parts = file.path.split("/");
      ensureParents(file.path); // Ensure parent dirs exist

      const fileNode: VaultFile = {
        name: file.name,
        path: file.path,
        type: "file",
        isLocked: file.isLocked ?? isPathLocked?.(file.path) ?? false,
      };

      if (parts.length === 1) {
        root.push(fileNode);
      } else {
        const parentPath = parts.slice(0, -1).join("/");
        const parent = map.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(fileNode);
        }
      }
    }
  }

  // Sort children of each directory
  const sortChildren = (nodes: VaultFile[]) => {
    nodes.sort((a, b) => {
      // _Index.md always first
      if (a.name === "_Index.md") return -1;
      if (b.name === "_Index.md") return 1;
      // Directories before files
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      // Alphabetical
      return a.name.localeCompare(b.name);
    });

    for (const node of nodes) {
      if (node.children) {
        sortChildren(node.children);
      }
    }
  };

  sortChildren(root);

  return root;
}
