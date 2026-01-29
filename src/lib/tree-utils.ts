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
