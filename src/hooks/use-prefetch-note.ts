import { useCallback, useRef } from "react";
import { cacheNote, getCachedNote } from "@/lib/note-cache";
import { githubClient } from "@/services/github-client";

// Track ongoing prefetch requests to avoid duplicates
const prefetchingPaths = new Set<string>();
// Track already prefetched paths in this session
const prefetchedPaths = new Set<string>();

/**
 * Hook to prefetch notes on hover
 * Fetches the note content and stores it in the cache
 */
export function usePrefetchNote() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prefetch = useCallback(async (path: string) => {
    // Only prefetch notes, not canvas/file (binary)
    if (!path.startsWith("/note/")) {
      return;
    }

    // Remove leading /note/ from path
    const cleanPath = path.replace(/^\/note\//, "");

    // Decode URI components and clean backslashes
    const decodedPath = decodeURIComponent(cleanPath)
      .replace(/\\+/g, "")
      .replace(/#.*$/, "");

    // Skip if already prefetched or currently prefetching
    if (prefetchedPaths.has(decodedPath) || prefetchingPaths.has(decodedPath)) {
      return;
    }

    // Check if already in cache
    const cached = await getCachedNote(decodedPath);
    if (cached) {
      prefetchedPaths.add(decodedPath);
      return;
    }

    // Mark as prefetching
    prefetchingPaths.add(decodedPath);

    try {
      // Fetch note data
      const noteData = await githubClient.readNote(decodedPath);

      // Cache it
      await cacheNote({
        path: decodedPath,
        content: noteData.content,
        sha: noteData.sha,
        frontmatter: noteData.frontmatter || {},
        wikilinks: noteData.wikilinks || [],
      });

      prefetchedPaths.add(decodedPath);
    } catch (error) {
      // Silently fail - it's just prefetching
      console.debug("Prefetch failed for:", decodedPath, error);
    } finally {
      prefetchingPaths.delete(decodedPath);
    }
  }, []);

  const handleMouseEnter = useCallback(
    (path: string) => {
      // Delay prefetch by 150ms to avoid unnecessary fetches on quick hovers
      timeoutRef.current = setTimeout(() => {
        prefetch(path);
      }, 150);
    },
    [prefetch]
  );

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { handleMouseEnter, handleMouseLeave, prefetch };
}

/**
 * Manually clear prefetch session cache
 * (useful after logout or vault change)
 */
export function clearPrefetchSession() {
  prefetchedPaths.clear();
  prefetchingPaths.clear();
}
