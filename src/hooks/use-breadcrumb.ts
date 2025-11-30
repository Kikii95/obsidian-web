"use client";

import { useMemo } from "react";

interface BreadcrumbItem {
  name: string;
  path: string;
  isLast: boolean;
}

/**
 * Hook to generate breadcrumb items from a decoded slug array
 */
export function useBreadcrumb(decodedSlug: string[]): BreadcrumbItem[] {
  return useMemo(() => {
    return decodedSlug.map((part, index) => ({
      name: part,
      path: decodedSlug.slice(0, index + 1).join("/"),
      isLast: index === decodedSlug.length - 1,
    }));
  }, [decodedSlug]);
}

/**
 * Get the last segment (file/folder name) from a slug
 */
export function useSlugName(decodedSlug: string[]): string {
  return useMemo(() => {
    return decodedSlug[decodedSlug.length - 1] || "";
  }, [decodedSlug]);
}
