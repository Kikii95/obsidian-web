"use client";

import { useState, useCallback } from "react";
import { githubClient, type NoteData } from "@/services/github-client";

interface UseNoteLockOptions {
  note: NoteData | null;
  onNoteUpdate?: (updates: Partial<NoteData>) => void;
}

interface UseNoteLockReturn {
  isTogglingLock: boolean;
  showUnlockPinDialog: boolean;
  toggleLock: () => Promise<void>;
  onPinSuccess: () => void;
  onPinCancel: () => void;
  error: string | null;
}

/**
 * Hook to manage note lock/unlock via frontmatter
 */
export function useNoteLock({
  note,
  onNoteUpdate,
}: UseNoteLockOptions): UseNoteLockReturn {
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [showUnlockPinDialog, setShowUnlockPinDialog] = useState(false);
  const [pendingUnlock, setPendingUnlock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLock = useCallback(async () => {
    if (!note) return;

    const currentlyLocked = note.isLocked || false;
    const newLockState = !currentlyLocked;

    // If removing lock, require PIN verification first
    if (currentlyLocked && !pendingUnlock) {
      setPendingUnlock(true);
      setShowUnlockPinDialog(true);
      return;
    }

    setPendingUnlock(false);
    setIsTogglingLock(true);
    setError(null);

    try {
      // Build new frontmatter
      const newFrontmatter = { ...note.frontmatter };
      if (newLockState) {
        newFrontmatter.private = true;
      } else {
        delete newFrontmatter.private;
        delete newFrontmatter.lock;
        delete newFrontmatter.locked;
        // Remove private/lock tags if present
        if (Array.isArray(newFrontmatter.tags)) {
          const filteredTags = (newFrontmatter.tags as string[]).filter(
            (tag) => !["private", "lock", "locked"].includes(String(tag).toLowerCase())
          );
          if (filteredTags.length === 0) {
            delete newFrontmatter.tags;
          } else {
            newFrontmatter.tags = filteredTags;
          }
        }
      }

      // Build new content with frontmatter
      const frontmatterLines = Object.entries(newFrontmatter).map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
        }
        if (typeof value === "string" && (value.includes(":") || value.includes("#"))) {
          return `${key}: "${value}"`;
        }
        return `${key}: ${value}`;
      });

      const newRawContent =
        Object.keys(newFrontmatter).length > 0
          ? `---\n${frontmatterLines.join("\n")}\n---\n\n${note.content}`
          : note.content;

      // Save to GitHub
      const result = await githubClient.saveNote(note.path, newRawContent, note.sha);

      // Update local state
      onNoteUpdate?.({
        sha: result.sha,
        frontmatter: newFrontmatter,
        isLocked: newLockState,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du changement de verrou");
    } finally {
      setIsTogglingLock(false);
    }
  }, [note, pendingUnlock, onNoteUpdate]);

  const onPinSuccess = useCallback(() => {
    setShowUnlockPinDialog(false);
    toggleLock();
  }, [toggleLock]);

  const onPinCancel = useCallback(() => {
    setShowUnlockPinDialog(false);
    setPendingUnlock(false);
  }, []);

  return {
    isTogglingLock,
    showUnlockPinDialog,
    toggleLock,
    onPinSuccess,
    onPinCancel,
    error,
  };
}
