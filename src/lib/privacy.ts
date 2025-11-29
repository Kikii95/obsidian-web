/**
 * Privacy utilities for filtering private notes
 *
 * A note is considered private if:
 * 1. Its path contains "_private" folder (e.g., _private/secret.md)
 * 2. Its frontmatter has `private: true`
 * 3. Its content contains the #private tag
 */

import matter from "gray-matter";

export interface PrivacyCheckResult {
  isPrivate: boolean;
  reason?: "path" | "frontmatter" | "tag";
}

/**
 * Check if a path is private based on naming conventions
 * Checks for _private folder or file starting with _private
 */
export function isPrivatePath(path: string): boolean {
  const segments = path.toLowerCase().split("/");
  return segments.some(
    (segment) =>
      segment === "_private" ||
      segment.startsWith("_private.") ||
      segment === "private"
  );
}

/**
 * Check if file content indicates a private note
 * Checks frontmatter and content for privacy markers
 */
export function isPrivateContent(content: string): PrivacyCheckResult {
  try {
    // Parse frontmatter
    const { data: frontmatter, content: body } = matter(content);

    // Check frontmatter for private: true
    if (frontmatter.private === true) {
      return { isPrivate: true, reason: "frontmatter" };
    }

    // Check for #private tag in content (not in code blocks)
    // Remove code blocks first to avoid false positives
    const contentWithoutCode = body
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "");

    // Look for #private tag (word boundary to avoid #privatize etc.)
    if (/(?:^|\s)#private(?:\s|$)/m.test(contentWithoutCode)) {
      return { isPrivate: true, reason: "tag" };
    }

    return { isPrivate: false };
  } catch {
    // If parsing fails, assume not private
    return { isPrivate: false };
  }
}

/**
 * Full privacy check combining path and content checks
 */
export function checkPrivacy(
  path: string,
  content?: string
): PrivacyCheckResult {
  // First check path
  if (isPrivatePath(path)) {
    return { isPrivate: true, reason: "path" };
  }

  // Then check content if provided
  if (content) {
    return isPrivateContent(content);
  }

  return { isPrivate: false };
}

/**
 * Filter out private paths from a list of file paths
 */
export function filterPrivatePaths<T extends { path: string }>(
  files: T[]
): T[] {
  return files.filter((file) => !isPrivatePath(file.path));
}
