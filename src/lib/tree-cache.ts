/**
 * Tree caching system using Cache API
 * Implements stale-while-revalidate pattern for optimal UX
 */

import type { VaultFile } from "@/types";

const CACHE_NAME = "obsidian-tree-v2";
const TREE_KEY = "/cached-tree";

// Cache settings
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes - consider fresh
const CACHE_STALE_AGE = 30 * 60 * 1000; // 30 minutes - serve stale, revalidate in background

interface CachedTree {
  tree: VaultFile[];
  cachedAt: number;
}

export interface CacheStatus {
  status: "fresh" | "stale" | "expired" | "none";
  age: number; // in seconds
  tree: VaultFile[] | null;
}

/**
 * Save tree to cache
 */
export async function cacheTree(tree: VaultFile[]): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedData: CachedTree = {
      tree,
      cachedAt: Date.now(),
    };

    const response = new Response(JSON.stringify(cachedData), {
      headers: {
        "Content-Type": "application/json",
        "X-Cached-At": String(cachedData.cachedAt),
      },
    });

    await cache.put(TREE_KEY, response);
  } catch (error) {
    console.warn("Failed to cache tree:", error);
  }
}

/**
 * Get tree from cache
 */
export async function getCachedTree(): Promise<VaultFile[] | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(TREE_KEY);

    if (!response) return null;

    const data: CachedTree = await response.json();
    return data.tree;
  } catch (error) {
    console.warn("Failed to get cached tree:", error);
    return null;
  }
}

/**
 * Get cache status with stale-while-revalidate logic
 * Returns status indicating if we should use cached data and/or fetch fresh
 */
export async function getTreeCacheStatus(): Promise<CacheStatus> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { status: "none", age: 0, tree: null };
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(TREE_KEY);

    if (!response) {
      return { status: "none", age: 0, tree: null };
    }

    const data: CachedTree = await response.json();
    const age = Date.now() - data.cachedAt;
    const ageSeconds = Math.floor(age / 1000);

    if (age < CACHE_MAX_AGE) {
      // Fresh - use cache, no need to revalidate
      return { status: "fresh", age: ageSeconds, tree: data.tree };
    } else if (age < CACHE_STALE_AGE) {
      // Stale - use cache but revalidate in background
      return { status: "stale", age: ageSeconds, tree: data.tree };
    } else {
      // Expired - don't use cache, fetch fresh
      return { status: "expired", age: ageSeconds, tree: null };
    }
  } catch (error) {
    console.warn("Failed to get tree cache status:", error);
    return { status: "none", age: 0, tree: null };
  }
}

/**
 * Get tree cache info
 */
export async function getTreeCacheInfo(): Promise<{
  hasCachedTree: boolean;
  cachedAt: Date | null;
  itemCount: number;
}> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { hasCachedTree: false, cachedAt: null, itemCount: 0 };
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(TREE_KEY);

    if (!response) {
      return { hasCachedTree: false, cachedAt: null, itemCount: 0 };
    }

    const data: CachedTree = await response.json();
    return {
      hasCachedTree: true,
      cachedAt: new Date(data.cachedAt),
      itemCount: data.tree.length,
    };
  } catch (error) {
    console.warn("Failed to get tree cache info:", error);
    return { hasCachedTree: false, cachedAt: null, itemCount: 0 };
  }
}

/**
 * Clear tree cache
 */
export async function clearTreeCache(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    await caches.delete(CACHE_NAME);
  } catch (error) {
    console.warn("Failed to clear tree cache:", error);
  }
}
