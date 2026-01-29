"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { githubClient } from "@/services/github-client";

// Lazy load CodeMirror editor (~500kb) - only loaded when editing
const MarkdownEditor = dynamic(
  () => import("@/components/editor/markdown-editor").then((mod) => mod.MarkdownEditor),
  {
    loading: () => (
      <div className="border border-border rounded-lg p-4 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    ),
    ssr: false,
  }
);
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronRight, FileText, RefreshCw } from "lucide-react";
import { NoteBreadcrumb, NoteToolbar, NoteWikilinks, NoteBacklinks } from "@/components/note";
import { LockedNoteView } from "@/components/lock/locked-note-view";
import { PinDialog } from "@/components/lock/pin-dialog";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useLockStore, isPathLocked } from "@/lib/lock-store";
import { useVaultStore } from "@/lib/store";
import { useNoteData } from "@/hooks/use-note-data";
import { useNoteEditor } from "@/hooks/use-note-editor";
import { useNoteExport } from "@/hooks/use-note-export";
import { useNoteLock } from "@/hooks/use-note-lock";
import { useBreadcrumb, useSlugName } from "@/hooks/use-breadcrumb";
import { decodeSlugSegments, buildFilePath } from "@/lib/path-utils";
import { useSettingsStore } from "@/lib/settings-store";
import { useSessionStateStore } from "@/lib/session-state-store";

// Count markdown files recursively
function countMdFiles(files: { type: string; name: string; children?: unknown[] }[]): number {
  let count = 0;
  for (const file of files) {
    if (file.type === "file" && file.name.endsWith(".md")) {
      count++;
    } else if (file.type === "dir" && file.children) {
      count += countMdFiles(file.children as { type: string; name: string; children?: unknown[] }[]);
    }
  }
  return count;
}

export default function NotePage() {
  const params = useParams();
  const { isOnline } = useOnlineStatus();
  const { isUnlocked, initializeLockState } = useLockStore();
  const { settings } = useSettingsStore();
  const { tree } = useVaultStore();
  const { setLastNote } = useSessionStateStore();

  // Editor style settings
  const editorMaxWidth = settings.editorMaxWidth ?? 800;
  const editorFontSize = settings.editorFontSize ?? 16;
  const editorLineHeight = settings.editorLineHeight ?? 1.6;
  const enableKeyboardShortcuts = settings.enableKeyboardShortcuts ?? true;

  // Count total md files for backlinks warning
  const totalMdFiles = useMemo(() => countMdFiles(tree), [tree]);

  // Parse slug
  const slug = params.slug as string[];
  const decodedSlug = useMemo(() => decodeSlugSegments(slug || []), [slug]);
  const filePath = useMemo(() => buildFilePath(decodedSlug), [decodedSlug]);
  const noteName = useSlugName(decodedSlug);
  const breadcrumbs = useBreadcrumb(decodedSlug);

  // Check if path is in _private folder
  const isPathPrivate = isPathLocked(filePath);

  // Initialize lock state on mount
  useEffect(() => {
    initializeLockState();
  }, [initializeLockState]);

  // Fetch note data
  const {
    note,
    isLoading,
    error,
    isFromCache,
    isNoteLocked,
    canViewNote,
    refetch,
    updateNote,
  } = useNoteData(filePath, { isUnlocked });

  // Ref for PDF export (captures rendered HTML)
  const contentRef = useRef<HTMLDivElement>(null);

  // Editor hook
  const editor = useNoteEditor({
    note,
    onNoteUpdate: updateNote,
  });

  // Export hook (with contentRef for styled PDF export)
  const exportFns = useNoteExport({
    note,
    fileName: noteName,
    currentContent: editor.isEditing ? editor.editContent : undefined,
    contentRef,
  });

  // Lock hook
  const lock = useNoteLock({
    note,
    onNoteUpdate: updateNote,
  });

  // Track last opened note for session persistence
  useEffect(() => {
    if (filePath && note) {
      setLastNote(filePath);
    }
  }, [filePath, note, setLastNote]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && editor.isEditing) {
        e.preventDefault();
        editor.save();
      }
      if (e.key === "Escape" && editor.isEditing) {
        e.preventDefault();
        editor.cancelEdit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, enableKeyboardShortcuts]);

  // Handle checkbox toggle in reader mode
  const handleCheckboxToggle = useCallback(
    async (taskText: string, newChecked: boolean) => {
      if (!note || !isOnline) return;

      // Build the regex to find this specific task
      // Match both - [ ] and - [x] followed by the task text
      const escapedText = taskText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const oldPattern = newChecked
        ? `- \\[ \\] ${escapedText}`
        : `- \\[x\\] ${escapedText}`;
      const newPattern = newChecked
        ? `- [x] ${taskText}`
        : `- [ ] ${taskText}`;

      const regex = new RegExp(oldPattern);
      if (!regex.test(note.content)) {
        console.warn("Checkbox pattern not found:", oldPattern);
        return;
      }

      const newContent = note.content.replace(regex, newPattern);

      try {
        const result = await githubClient.saveNote(note.path, newContent, note.sha);
        updateNote({ content: newContent, sha: result.sha });
      } catch (err) {
        console.error("Failed to toggle checkbox:", err);
      }
    },
    [note, isOnline, updateNote]
  );

  // Show locked view for private notes
  if (isNoteLocked && !canViewNote) {
    return <LockedNoteView noteName={noteName || "Note"} />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Skeleton className="h-4 w-20" />
          <ChevronRight className="h-3 w-3" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-2" />
        <Skeleton className="h-4 w-4/6 mb-2" />
        <Skeleton className="h-32 w-full mt-6" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Erreur de chargement</h2>
          <p className="text-muted-foreground text-center max-w-md">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!note) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Note non trouvée</h2>
          <p className="text-muted-foreground">
            Le fichier demandé n&apos;existe pas.
          </p>
          <Button variant="ghost" asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Title from frontmatter or file name
  const title = (note.frontmatter?.title as string) || noteName || "Sans titre";

  // Container max-width: use wider for editing, user setting for viewing
  const containerMaxWidth = editor.isEditing ? 1152 : editorMaxWidth;

  return (
    <div
      className="p-4 sm:p-6 mx-auto"
      style={{ maxWidth: containerMaxWidth }}
    >
      {/* Header with breadcrumb and actions */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-6">
        <NoteBreadcrumb items={breadcrumbs} />
        <NoteToolbar
          note={note}
          noteName={noteName}
          isOnline={isOnline}
          isFromCache={isFromCache}
          isPathPrivate={isPathPrivate}
          isEditing={editor.isEditing}
          isSaving={editor.isSaving}
          hasChanges={editor.hasChanges}
          onStartEdit={editor.startEdit}
          onCancelEdit={editor.cancelEdit}
          onSave={editor.save}
          isTogglingLock={lock.isTogglingLock}
          onToggleLock={lock.toggleLock}
          onExportMd={exportFns.exportMd}
          onExportPdf={exportFns.exportPdf}
          onCopyAll={exportFns.copyAll}
          isExportingPdf={exportFns.isExportingPdf}
          copied={exportFns.copied}
        />
      </div>

      {/* Unsaved changes indicator */}
      {editor.isEditing && editor.hasChanges && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-500">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Modifications non sauvegardées (Ctrl+S pour sauvegarder)
        </div>
      )}

      {/* Frontmatter badges */}
      {(settings.showFrontmatter ?? true) && note.frontmatter && Object.keys(note.frontmatter).length > 0 && !editor.isEditing && (
        <div className="flex flex-wrap gap-2 mb-4">
          {note.frontmatter.status ? (
            <Badge variant="outline">{String(note.frontmatter.status)}</Badge>
          ) : null}
          {Array.isArray(note.frontmatter.tags)
            ? note.frontmatter.tags.map((tag) => (
                <Badge key={String(tag)} variant="secondary">
                  #{String(tag)}
                </Badge>
              ))
            : null}
        </div>
      )}

      {/* Content - Editor or Viewer */}
      <article
        style={{
          fontSize: editorFontSize,
          lineHeight: editorLineHeight,
        }}
      >
        {editor.isEditing ? (
          <MarkdownEditor content={editor.editContent} onChange={editor.setEditContent} />
        ) : (
          <div ref={contentRef}>
            {/* Key forces re-render when tree loads (fixes wikilink resolution timing) */}
            <MarkdownRenderer
              key={`md-${tree.length}`}
              content={note.content}
              canToggleCheckbox={isOnline && !isFromCache}
              onCheckboxToggle={handleCheckboxToggle}
            />
          </div>
        )}
      </article>

      {/* Wikilinks section */}
      {!editor.isEditing && note.wikilinks && (
        <NoteWikilinks wikilinks={note.wikilinks} />
      )}

      {/* Backlinks section */}
      {!editor.isEditing && (
        <NoteBacklinks notePath={filePath} totalFiles={totalMdFiles} />
      )}

      {/* PIN Dialog for verifying PIN when removing lock */}
      <PinDialog
        open={lock.showUnlockPinDialog}
        onOpenChange={(open) => {
          if (!open) lock.onPinCancel();
        }}
        onSuccess={lock.onPinSuccess}
        mode="verify"
      />
    </div>
  );
}
