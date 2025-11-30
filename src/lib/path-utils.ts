/**
 * Path utilities for URL encoding/decoding
 */

/**
 * Encode each segment of a path for URL usage
 * Example: "folder/my file.md" → "folder/my%20file.md"
 */
export function encodePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Decode each segment of a URL path
 * Example: "folder/my%20file.md" → "folder/my file.md"
 */
export function decodePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

/**
 * Decode an array of path segments (from Next.js params)
 */
export function decodeSlugSegments(slug: string[]): string[] {
  return slug.map((s) => decodeURIComponent(s));
}

/**
 * Get the file name from a path (without extension)
 */
export function getFileName(path: string): string {
  const name = path.split("/").pop() || "";
  return name.replace(/\.[^.]+$/, "");
}

/**
 * Get the file extension from a path
 */
export function getFileExtension(path: string): string {
  const match = path.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Get the parent folder path
 */
export function getParentPath(path: string): string {
  const segments = path.split("/");
  segments.pop();
  return segments.join("/");
}

/**
 * Join path segments, filtering out empty strings
 */
export function joinPath(...segments: string[]): string {
  return segments.filter(Boolean).join("/");
}

/**
 * Check if path is within a private folder
 */
export function isPrivatePath(path: string): boolean {
  return path.includes("_private/") || path.startsWith("_private");
}

/**
 * Build a note URL from slug segments
 */
export function buildNoteUrl(slug: string[]): string {
  return `/note/${encodePathSegments(slug.join("/"))}`;
}

/**
 * Build a file path from slug segments (adds .md extension)
 */
export function buildFilePath(slug: string[]): string {
  return slug.length > 0 ? `${slug.join("/")}.md` : "";
}
