"use client";

import { useState, useCallback, useEffect } from "react";
import { githubClient, type NoteData } from "@/services/github-client";
import { mergeInlineTagsToFrontmatter } from "@/lib/tag-utils";

interface UseNoteEditorOptions {
  note: NoteData | null;
  onNoteUpdate?: (updates: Partial<NoteData>) => void;
  /** Called after save to refetch note (updates frontmatter/tags) */
  onSaveSuccess?: () => Promise<void> | void;
}

interface UseNoteEditorReturn {
  isEditing: boolean;
  editContent: string;
  isSaving: boolean;
  hasChanges: boolean;
  setEditContent: (content: string) => void;
  startEdit: () => void;
  cancelEdit: () => void;
  save: () => Promise<void>;
  error: string | null;
}

/**
 * Hook to manage note editing state and save logic
 */
export function useNoteEditor({
  note,
  onNoteUpdate,
  onSaveSuccess,
}: UseNoteEditorOptions): UseNoteEditorReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync edit content when note changes
  useEffect(() => {
    if (note) {
      setEditContent(note.content);
    }
  }, [note?.content]);

  // Track changes
  useEffect(() => {
    if (note) {
      setHasChanges(editContent !== note.content);
    }
  }, [editContent, note]);

  // Reset edit state when note changes
  useEffect(() => {
    setIsEditing(false);
    setHasChanges(false);
    setError(null);
  }, [note?.path]);

  const startEdit = useCallback(() => {
    if (note) {
      setEditContent(note.content);
    }
    setIsEditing(true);
    setError(null);
  }, [note]);

  const cancelEdit = useCallback(() => {
    if (note) {
      setEditContent(note.content);
    }
    setIsEditing(false);
    setHasChanges(false);
    setError(null);
  }, [note]);

  const save = useCallback(async () => {
    if (!note || !hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      // Merge inline tags (#tag) to frontmatter before saving
      const contentWithTags = mergeInlineTagsToFrontmatter(editContent);

      const result = await githubClient.saveNote(
        note.path,
        contentWithTags,
        note.sha
      );

      // Update local content if tags were merged
      if (contentWithTags !== editContent) {
        setEditContent(contentWithTags);
      }

      // Update note with new sha and content
      onNoteUpdate?.({
        content: contentWithTags,
        sha: result.sha,
      });

      setHasChanges(false);
      setIsEditing(false);

      // Refetch note to update frontmatter/tags
      await onSaveSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setIsSaving(false);
    }
  }, [note, editContent, hasChanges, onNoteUpdate, onSaveSuccess]);

  return {
    isEditing,
    editContent,
    isSaving,
    hasChanges,
    setEditContent,
    startEdit,
    cancelEdit,
    save,
    error,
  };
}
