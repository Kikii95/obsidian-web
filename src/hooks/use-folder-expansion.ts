"use client";

import { useState, useCallback } from "react";

/**
 * Hook to manage folder expansion state locally
 * Used for share viewer where we don't want to use global vault store
 */
export function useFolderExpansion(initialExpanded: string[] = []) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(initialExpanded)
  );

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const expandFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      newSet.add(path);
      return newSet;
    });
  }, []);

  const collapseFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });
  }, []);

  const expandAll = useCallback((paths: string[]) => {
    setExpandedFolders(new Set(paths));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const isExpanded = useCallback(
    (path: string) => expandedFolders.has(path),
    [expandedFolders]
  );

  return {
    expandedFolders,
    toggleFolder,
    expandFolder,
    collapseFolder,
    expandAll,
    collapseAll,
    isExpanded,
  };
}
