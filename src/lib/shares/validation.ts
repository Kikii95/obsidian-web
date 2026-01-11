/**
 * Path validation utilities for share access control
 * Prevents directory traversal and ensures access stays within shared folder
 */

/**
 * Normalize a path for comparison
 * - Converts backslashes to forward slashes
 * - Removes leading/trailing slashes
 * - Removes duplicate slashes
 */
function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

/**
 * Check if a requested path is within the shared folder boundaries
 *
 * @param requestedPath - The path the user is trying to access
 * @param shareFolderPath - The root folder that was shared
 * @param includeSubfolders - Whether subfolders are accessible
 * @returns true if access is allowed, false otherwise
 */
export function validateSharePath(
  requestedPath: string,
  shareFolderPath: string,
  includeSubfolders: boolean
): boolean {
  const normalizedRequested = normalizePath(requestedPath);
  const normalizedShare = normalizePath(shareFolderPath);

  // Prevent directory traversal attacks
  if (normalizedRequested.includes("..")) {
    return false;
  }

  // Empty share folder means root access (shouldn't happen but handle it)
  if (!normalizedShare) {
    return true;
  }

  // Check if requested path starts with share folder
  if (!normalizedRequested.startsWith(normalizedShare)) {
    return false;
  }

  // If subfolders not allowed, check that it's a direct child
  if (!includeSubfolders) {
    const relativePath = normalizedRequested.slice(normalizedShare.length);
    // Remove leading slash if present
    const cleanRelative = relativePath.replace(/^\//, "");

    // Direct child means no more slashes in the relative path
    // (file.md is ok, subfolder/file.md is not)
    if (cleanRelative.includes("/")) {
      return false;
    }
  }

  return true;
}

/**
 * Get the relative path from share root
 */
export function getRelativePath(
  fullPath: string,
  shareFolderPath: string
): string {
  const normalizedFull = normalizePath(fullPath);
  const normalizedShare = normalizePath(shareFolderPath);

  if (!normalizedShare) {
    return normalizedFull;
  }

  if (!normalizedFull.startsWith(normalizedShare)) {
    return normalizedFull;
  }

  return normalizedFull.slice(normalizedShare.length).replace(/^\//, "");
}

/**
 * Check if a path represents a file within the shared folder (not a subfolder)
 */
export function isDirectChild(
  filePath: string,
  shareFolderPath: string
): boolean {
  const relativePath = getRelativePath(filePath, shareFolderPath);
  return !relativePath.includes("/");
}

/**
 * Build the full path by combining share folder path with relative path
 */
export function buildFullPath(
  shareFolderPath: string,
  relativePath: string
): string {
  const normalizedShare = normalizePath(shareFolderPath);
  const normalizedRelative = normalizePath(relativePath);

  if (!normalizedShare) {
    return normalizedRelative;
  }

  if (!normalizedRelative) {
    return normalizedShare;
  }

  return `${normalizedShare}/${normalizedRelative}`;
}
