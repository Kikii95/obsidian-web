import { useMemo } from "react";
import type { VaultFile } from "@/types";
import { isViewableFile } from "@/lib/file-types";

export interface FlatTreeItem {
  file: VaultFile;
  depth: number;
  isExpanded: boolean;
  isLastChild: boolean;
  parentPaths: string[]; // For rendering indent guides
}

/**
 * Flattens a hierarchical file tree into a flat list based on expanded folders.
 * Only includes items that are currently visible (parent folders expanded).
 */
export function useFlattenedTree(
  tree: VaultFile[],
  expandedFolders: Set<string>
): FlatTreeItem[] {
  return useMemo(() => {
    const result: FlatTreeItem[] = [];

    function flatten(
      files: VaultFile[],
      depth: number,
      parentPaths: string[]
    ) {
      // Sort: directories first, then alphabetically
      const sorted = [...files].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "dir" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      sorted.forEach((file, index) => {
        const isDirectory = file.type === "dir";
        const isExpanded = expandedFolders.has(file.path);
        const isLastChild = index === sorted.length - 1;

        // Skip non-viewable files
        if (!isDirectory && !isViewableFile(file.name)) {
          return;
        }

        result.push({
          file,
          depth,
          isExpanded,
          isLastChild,
          parentPaths,
        });

        // Recursively add children if folder is expanded
        if (isDirectory && isExpanded && file.children) {
          flatten(file.children, depth + 1, [...parentPaths, file.path]);
        }
      });
    }

    flatten(tree, 0, []);
    return result;
  }, [tree, expandedFolders]);
}
