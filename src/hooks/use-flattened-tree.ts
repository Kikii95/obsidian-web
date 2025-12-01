import { useMemo } from "react";
import type { VaultFile } from "@/types";
import { isViewableFile } from "@/lib/file-types";
import { useSettingsStore } from "@/lib/settings-store";
import { useLockStore } from "@/lib/lock-store";

export interface FlatTreeItem {
  file: VaultFile;
  depth: number;
  isExpanded: boolean;
  isLastChild: boolean;
  parentPaths: string[]; // For rendering indent guides
  isPrivateFolder: boolean; // Is this a _private folder with hidden children
}

// Check if folder name indicates a private folder
function isPrivateFolderName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName === "_private" || lowerName.startsWith("_private.");
}

/**
 * Flattens a hierarchical file tree into a flat list based on expanded folders.
 * Only includes items that are currently visible (parent folders expanded).
 * Hides children of _private folders when requirePinOnPrivateFolder is enabled.
 */
export function useFlattenedTree(
  tree: VaultFile[],
  expandedFolders: Set<string>
): FlatTreeItem[] {
  const { settings, getFolderOrder } = useSettingsStore();
  const { hasPinConfigured, isUnlocked } = useLockStore();

  // Should we hide children of _private folders?
  const hidePrivateChildren =
    settings.requirePinOnPrivateFolder &&
    hasPinConfigured &&
    !isUnlocked;

  // Get custom folder orders (defensive)
  const customFolderOrders = settings.customFolderOrders || {};

  return useMemo(() => {
    const result: FlatTreeItem[] = [];

    function flatten(
      files: VaultFile[],
      depth: number,
      parentPaths: string[],
      insidePrivate: boolean = false
    ) {
      // Get parent path for custom ordering
      const parentPath = parentPaths.length > 0
        ? parentPaths[parentPaths.length - 1]
        : "";

      // Get custom order for this folder level (defensive)
      let customOrder: string[] = [];
      try {
        const order = getFolderOrder(parentPath);
        customOrder = Array.isArray(order) ? order : [];
      } catch {
        customOrder = [];
      }

      // Sort: directories first, then by custom order or alphabetically
      const sorted = [...files].sort((a, b) => {
        // Folders first
        if (a.type !== b.type) {
          return a.type === "dir" ? -1 : 1;
        }

        // Apply custom order for folders
        if (a.type === "dir" && b.type === "dir" && customOrder.length > 0) {
          const aIndex = customOrder.indexOf(a.name);
          const bIndex = customOrder.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
        }

        // Fallback to alphabetical
        return a.name.localeCompare(b.name);
      });

      sorted.forEach((file, index) => {
        const isDirectory = file.type === "dir";
        const isExpanded = expandedFolders.has(file.path);
        const isLastChild = index === sorted.length - 1;
        const isPrivateFolder = isDirectory && isPrivateFolderName(file.name);

        // Skip non-viewable files
        if (!isDirectory && !isViewableFile(file.name)) {
          return;
        }

        // Skip files inside _private folders when locked
        if (insidePrivate && hidePrivateChildren) {
          return;
        }

        result.push({
          file,
          depth,
          isExpanded,
          isLastChild,
          parentPaths,
          isPrivateFolder: isPrivateFolder && hidePrivateChildren,
        });

        // Recursively add children if folder is expanded
        if (isDirectory && isExpanded && file.children) {
          // If this is a _private folder and we're hiding children, don't recurse
          if (isPrivateFolder && hidePrivateChildren) {
            return;
          }
          flatten(
            file.children,
            depth + 1,
            [...parentPaths, file.path],
            insidePrivate || isPrivateFolder
          );
        }
      });
    }

    flatten(tree, 0, [], false);
    return result;
  }, [tree, expandedFolders, hidePrivateChildren, customFolderOrders, getFolderOrder]);
}
