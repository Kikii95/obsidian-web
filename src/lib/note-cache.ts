/**
 * Note caching system using Cache API
 * Stores fetched notes for offline access
 */

const CACHE_NAME = "obsidian-notes-v1";

interface CachedNote {
  path: string;
  content: string;
  sha: string;
  frontmatter: Record<string, unknown>;
  wikilinks: string[];
  cachedAt: number;
}

/**
 * Save a note to the cache
 */
export async function cacheNote(note: Omit<CachedNote, "cachedAt">): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedData: CachedNote = {
      ...note,
      cachedAt: Date.now(),
    };

    // Store as a fake Response with JSON
    const response = new Response(JSON.stringify(cachedData), {
      headers: {
        "Content-Type": "application/json",
        "X-Cached-At": String(cachedData.cachedAt),
      },
    });

    await cache.put(`/cached-note/${encodeURIComponent(note.path)}`, response);
  } catch (error) {
    console.warn("Failed to cache note:", error);
  }
}

/**
 * Get a note from the cache
 */
export async function getCachedNote(path: string): Promise<CachedNote | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(`/cached-note/${encodeURIComponent(path)}`);

    if (!response) return null;

    const data = await response.json();
    return data as CachedNote;
  } catch (error) {
    console.warn("Failed to get cached note:", error);
    return null;
  }
}

/**
 * Get all cached notes
 */
export async function getAllCachedNotes(): Promise<CachedNote[]> {
  if (typeof window === "undefined" || !("caches" in window)) return [];

  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const notes: CachedNote[] = [];

    for (const request of keys) {
      if (request.url.includes("/cached-note/")) {
        const response = await cache.match(request);
        if (response) {
          const data = await response.json();
          notes.push(data as CachedNote);
        }
      }
    }

    // Sort by most recently cached
    return notes.sort((a, b) => b.cachedAt - a.cachedAt);
  } catch (error) {
    console.warn("Failed to get cached notes:", error);
    return [];
  }
}

/**
 * Remove a note from the cache
 */
export async function removeCachedNote(path: string): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(`/cached-note/${encodeURIComponent(path)}`);
  } catch (error) {
    console.warn("Failed to remove cached note:", error);
  }
}

/**
 * Clear all cached notes
 */
export async function clearNotesCache(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    await caches.delete(CACHE_NAME);
  } catch (error) {
    console.warn("Failed to clear notes cache:", error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ count: number; oldestDate: Date | null }> {
  const notes = await getAllCachedNotes();
  if (notes.length === 0) {
    return { count: 0, oldestDate: null };
  }

  const oldest = notes.reduce((min, note) =>
    note.cachedAt < min.cachedAt ? note : min
  );

  return {
    count: notes.length,
    oldestDate: new Date(oldest.cachedAt),
  };
}
