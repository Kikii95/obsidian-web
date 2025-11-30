"use client";

import { useState, useEffect, useCallback } from "react";
import { githubClient, type NoteData } from "@/services/github-client";
import { cacheNote, getCachedNote } from "@/lib/note-cache";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { isPathLocked } from "@/lib/lock-store";

interface UseNoteDataOptions {
  /** Whether the user has unlocked private notes */
  isUnlocked?: boolean;
}

interface UseNoteDataReturn {
  note: NoteData | null;
  isLoading: boolean;
  error: string | null;
  isFromCache: boolean;
  /** Whether the note is locked (path or frontmatter) */
  isNoteLocked: boolean;
  /** Whether the note can be viewed (unlocked or not locked) */
  canViewNote: boolean;
  /** Refetch the note */
  refetch: () => Promise<void>;
  /** Update note data locally (after save) */
  updateNote: (updates: Partial<NoteData>) => void;
}

/**
 * Hook to fetch and manage note data with offline support
 */
export function useNoteData(
  filePath: string,
  options: UseNoteDataOptions = {}
): UseNoteDataReturn {
  const { isUnlocked = false } = options;
  const { isOnline } = useOnlineStatus();

  const [note, setNote] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Check if path is in _private folder
  const isPathPrivate = isPathLocked(filePath);

  // Combined lock check: path-based OR frontmatter-based
  const isNoteLocked = isPathPrivate || (note?.isLocked ?? false);
  const canViewNote = !isNoteLocked || isUnlocked;

  const fetchNote = useCallback(async () => {
    if (!filePath) return;

    // For path-based lock, don't fetch until unlocked
    if (isPathPrivate && !isUnlocked) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsFromCache(false);

    try {
      if (isOnline) {
        // Fetch from API
        const data = await githubClient.readNote(filePath);
        setNote(data);

        // Cache for offline access
        await cacheNote({
          path: data.path,
          content: data.content,
          sha: data.sha,
          frontmatter: data.frontmatter,
          wikilinks: data.wikilinks,
        });
      } else {
        // Offline: try cache
        const cached = await getCachedNote(filePath);
        if (cached) {
          setNote({
            path: cached.path,
            content: cached.content,
            sha: cached.sha,
            frontmatter: cached.frontmatter,
            wikilinks: cached.wikilinks,
          });
          setIsFromCache(true);
        } else {
          throw new Error("Note non disponible hors ligne");
        }
      }
    } catch (err) {
      // If online fetch failed, try cache as fallback
      if (isOnline) {
        const cached = await getCachedNote(filePath);
        if (cached) {
          setNote({
            path: cached.path,
            content: cached.content,
            sha: cached.sha,
            frontmatter: cached.frontmatter,
            wikilinks: cached.wikilinks,
          });
          setIsFromCache(true);
          setError(null);
          setIsLoading(false);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [filePath, isOnline, isPathPrivate, isUnlocked]);

  // Reset state when path changes
  useEffect(() => {
    setNote(null);
    setError(null);
    setIsLoading(true);
  }, [filePath]);

  // Fetch when path changes or unlock status changes
  useEffect(() => {
    if (!isPathPrivate || isUnlocked) {
      fetchNote();
    }
  }, [filePath, isPathPrivate, isUnlocked, fetchNote]);

  const updateNote = useCallback((updates: Partial<NoteData>) => {
    setNote((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  return {
    note,
    isLoading,
    error,
    isFromCache,
    isNoteLocked,
    canViewNote,
    refetch: fetchNote,
    updateNote,
  };
}
