"use client";

import { useState, useEffect, useCallback } from "react";
import type { TagCompletionItem } from "@/components/editor/autocomplete/types";

interface TagsApiResponse {
  tags: Array<{
    name: string;
    count: number;
    notes: Array<{ path: string; name: string }>;
  }>;
  totalTags: number;
  totalNotes: number;
  fromIndex: boolean;
  needsIndex?: boolean;
  message?: string;
}

interface UseTagsResult {
  tags: TagCompletionItem[];
  isLoading: boolean;
  error: string | null;
  needsIndex: boolean;
  refetch: () => Promise<void>;
}

let cachedTags: TagCompletionItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch tags from the API with caching
 */
export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<TagCompletionItem[]>(cachedTags ?? []);
  const [isLoading, setIsLoading] = useState(!cachedTags);
  const [error, setError] = useState<string | null>(null);
  const [needsIndex, setNeedsIndex] = useState(false);

  const fetchTags = useCallback(async () => {
    // Check cache first
    if (cachedTags && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setTags(cachedTags);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/tags");

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status}`);
      }

      const data: TagsApiResponse = await response.json();

      if (data.needsIndex) {
        setNeedsIndex(true);
        setTags([]);
        cachedTags = [];
      } else {
        const formattedTags: TagCompletionItem[] = data.tags.map((tag) => ({
          name: tag.name,
          count: tag.count,
        }));

        setTags(formattedTags);
        cachedTags = formattedTags;
        cacheTimestamp = Date.now();
        setNeedsIndex(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Error fetching tags:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    isLoading,
    error,
    needsIndex,
    refetch: fetchTags,
  };
}

/**
 * Clear the tags cache (useful after indexing)
 */
export function clearTagsCache() {
  cachedTags = null;
  cacheTimestamp = 0;
}
