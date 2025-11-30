/**
 * Tree caching system using Cache API
 * Stores vault tree for offline navigation
 */

import type { VaultFile } from "@/types";

const CACHE_NAME = "obsidian-tree-v1";
const TREE_KEY = "/cached-tree";

interface CachedTree {
  tree: VaultFile[];
  cachedAt: number;
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
