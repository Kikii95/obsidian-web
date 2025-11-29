"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  RefreshCw,
  Pencil,
  Eye,
  Save,
  X,
  Loader2,
  Lock,
  LockOpen,
  CloudOff,
  Trash2,
  FolderInput,
  TextCursorInput,
  MoreHorizontal,
  Download,
  FileDown,
  Printer,
  Upload,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cacheNote, getCachedNote } from "@/lib/note-cache";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { MoveNoteDialog } from "@/components/notes/move-note-dialog";
import { RenameNoteDialog } from "@/components/notes/rename-note-dialog";
import { LockedNoteView } from "@/components/lock/locked-note-view";
import { PinDialog } from "@/components/lock/pin-dialog";
import { useLockStore, isPathLocked } from "@/lib/lock-store";

interface NoteData {
  path: string;
  content: string;
  sha: string;
  frontmatter: Record<string, unknown>;
  wikilinks: string[];
  isLocked?: boolean; // From API (path OR frontmatter)
}

export default function NotePage() {
  const params = useParams();
  const { isOnline } = useOnlineStatus();
  const { isUnlocked, initializeLockState } = useLockStore();
  const [note, setNote] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [showUnlockPinDialog, setShowUnlockPinDialog] = useState(false);
  const [pendingUnlock, setPendingUnlock] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build the file path from slug (decode each segment)
  const slug = params.slug as string[];
  const decodedSlug = slug?.map((s) => decodeURIComponent(s)) || [];
  const filePath = decodedSlug.length > 0 ? `${decodedSlug.join("/")}.md` : "";

  // Check if path is in _private folder (quick check before fetch)
  const isPathPrivate = isPathLocked(filePath);

  // Combined lock check: path-based OR frontmatter-based (from API)
  const isNoteLocked = isPathPrivate || (note?.isLocked ?? false);
  const canViewNote = !isNoteLocked || isUnlocked;

  // Initialize lock state on mount
  useEffect(() => {
    initializeLockState();
  }, [initializeLockState]);

  const fetchNote = async () => {
    if (!filePath) return;
    // For path-based lock, don't fetch until unlocked
    // For frontmatter-based lock, we need to fetch to know
    if (isPathPrivate && !isUnlocked) return;

    setIsLoading(true);
    setError(null);
    setIsFromCache(false);

    try {
      // Try to fetch from API first if online
      if (isOnline) {
        const response = await fetch(
          `/api/github/read?path=${encodeURIComponent(filePath)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors du chargement");
        }

        setNote(data);
        setEditContent(data.content);

        // Cache the note for offline access
        await cacheNote({
          path: data.path,
          content: data.content,
          sha: data.sha,
          frontmatter: data.frontmatter,
          wikilinks: data.wikilinks,
        });
      } else {
        // Offline: try to get from cache
        const cached = await getCachedNote(filePath);
        if (cached) {
          setNote({
            path: cached.path,
            content: cached.content,
            sha: cached.sha,
            frontmatter: cached.frontmatter,
            wikilinks: cached.wikilinks,
          });
          setEditContent(cached.content);
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
          setEditContent(cached.content);
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
  };

  // Reset note state when navigating to a different note
  useEffect(() => {
    setNote(null);
    setError(null);
    setIsLoading(true);
    setIsEditing(false);
    setHasChanges(false);
  }, [filePath]);

  useEffect(() => {
    // For path-based lock: only fetch after unlock
    // For other notes: always fetch (to discover frontmatter locks)
    if (!isPathPrivate || isUnlocked) {
      fetchNote();
    }
  }, [filePath, isPathPrivate, isUnlocked]);

  // Track changes
  useEffect(() => {
    if (note) {
      setHasChanges(editContent !== note.content);
    }
  }, [editContent, note]);

  const handleSave = useCallback(async () => {
    if (!note || !hasChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/github/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: note.path,
          content: editContent,
          sha: note.sha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      // Update note with new sha and content
      setNote({
        ...note,
        content: editContent,
        sha: data.sha,
      });
      setHasChanges(false);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setIsSaving(false);
    }
  }, [note, editContent, hasChanges]);

  const handleCancelEdit = useCallback(() => {
    if (note) {
      setEditContent(note.content);
    }
    setIsEditing(false);
    setHasChanges(false);
  }, [note]);

  const handleStartEdit = useCallback(() => {
    if (note) {
      setEditContent(note.content);
    }
    setIsEditing(true);
  }, [note]);

  // Toggle lock status by modifying frontmatter
  const handleToggleLock = useCallback(async () => {
    if (!note) return;

    // Determine new lock state
    const currentlyLocked = note.isLocked || false;
    const newLockState = !currentlyLocked;

    // If removing lock, require PIN verification first
    if (currentlyLocked && !pendingUnlock) {
      setPendingUnlock(true);
      setShowUnlockPinDialog(true);
      return;
    }

    // Reset pending state
    setPendingUnlock(false);

    setIsTogglingLock(true);
    try {
      // Build new frontmatter
      const newFrontmatter = { ...note.frontmatter };
      if (newLockState) {
        newFrontmatter.private = true;
      } else {
        delete newFrontmatter.private;
        delete newFrontmatter.lock;
        delete newFrontmatter.locked;
        // Also remove private/lock tags if present
        if (Array.isArray(newFrontmatter.tags)) {
          const filteredTags = (newFrontmatter.tags as unknown[]).filter(
            (tag: unknown) => !["private", "lock", "locked"].includes(String(tag).toLowerCase())
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
          return `${key}:\n${value.map(v => `  - ${v}`).join("\n")}`;
        }
        if (typeof value === "string" && (value.includes(":") || value.includes("#"))) {
          return `${key}: "${value}"`;
        }
        return `${key}: ${value}`;
      });

      const newRawContent = Object.keys(newFrontmatter).length > 0
        ? `---\n${frontmatterLines.join("\n")}\n---\n\n${note.content}`
        : note.content;

      // Save to GitHub
      const response = await fetch("/api/github/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: note.path,
          content: newRawContent,
          sha: note.sha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      // Update local state
      setNote({
        ...note,
        sha: data.sha,
        frontmatter: newFrontmatter,
        isLocked: newLockState,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du changement de verrou");
    } finally {
      setIsTogglingLock(false);
    }
  }, [note, pendingUnlock]);

  // Handle successful PIN verification for unlock
  const handleUnlockPinSuccess = useCallback(() => {
    setShowUnlockPinDialog(false);
    // Continue with the unlock
    handleToggleLock();
  }, [handleToggleLock]);

  // Handle PIN dialog close without success
  const handleUnlockPinCancel = useCallback(() => {
    setShowUnlockPinDialog(false);
    setPendingUnlock(false);
  }, []);

  // Export as Markdown
  const handleExportMd = useCallback(() => {
    if (!note) return;
    const fileName = decodedSlug[decodedSlug.length - 1] || "note";
    const blob = new Blob([note.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [note, decodedSlug]);

  // Print as PDF (uses browser print dialog)
  const handlePrintPdf = useCallback(() => {
    window.print();
  }, []);

  // Copy all content (for mobile)
  const handleCopyAll = useCallback(async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(isEditing ? editContent : note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [note, isEditing, editContent]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && isEditing) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        handleCancelEdit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, handleSave, handleCancelEdit]);

  // Build breadcrumb (use decoded slug for display)
  const breadcrumbs = decodedSlug?.map((part, index) => ({
    name: part,
    path: decodedSlug.slice(0, index + 1).join("/"),
    isLast: index === decodedSlug.length - 1,
  }));

  // Show locked view for private notes
  if (isNoteLocked && !canViewNote) {
    return (
      <LockedNoteView
        noteName={decodedSlug[decodedSlug.length - 1] || "Note"}
      />
    );
  }

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

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Erreur de chargement</h2>
          <p className="text-muted-foreground text-center max-w-md">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchNote}>
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

  // Extract title from frontmatter or last segment of path
  const title =
    (note.frontmatter?.title as string) ||
    decodedSlug[decodedSlug.length - 1] ||
    "Sans titre";

  return (
    <div className={`p-4 sm:p-6 mx-auto ${isEditing ? "max-w-6xl" : "max-w-4xl"}`}>
      {/* Header with breadcrumb and actions */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap min-w-0 overflow-hidden">
          <Link href="/" className="hover:text-foreground transition-colors shrink-0">
            Vault
          </Link>
          {breadcrumbs?.map((crumb) => (
            <div key={crumb.path} className="flex items-center gap-1 min-w-0">
              <ChevronRight className="h-3 w-3 shrink-0" />
              {crumb.isLast ? (
                <span className="text-foreground font-medium truncate">{crumb.name}</span>
              ) : (
                <span className="text-muted-foreground truncate">
                  {crumb.name}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Edit/View/Save buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Cache indicator */}
          {isFromCache && (
            <div
              className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded"
              title="Cette note est chargée depuis le cache local"
            >
              <CloudOff className="h-3 w-3" />
              <span className="hidden sm:inline">Cache</span>
            </div>
          )}

          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !isOnline}
                className="glow-soft"
                title={!isOnline ? "Édition désactivée hors ligne" : undefined}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                disabled={!isOnline || isFromCache}
                title={
                  !isOnline || isFromCache
                    ? "Édition désactivée hors ligne"
                    : undefined
                }
              >
                <Pencil className="h-4 w-4 mr-1" />
                Éditer
              </Button>
              {isOnline && !isFromCache && (
                <>
                  {/* Desktop: show all buttons */}
                  <div className="hidden sm:flex items-center gap-1">
                    <RenameNoteDialog
                      path={note.path}
                      sha={note.sha}
                      currentName={decodedSlug[decodedSlug.length - 1]}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Renommer la note"
                        >
                          <TextCursorInput className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <MoveNoteDialog
                      path={note.path}
                      sha={note.sha}
                      noteName={decodedSlug[decodedSlug.length - 1]}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Déplacer la note"
                        >
                          <FolderInput className="h-4 w-4" />
                        </Button>
                      }
                    />
                    {!isPathPrivate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleLock}
                        disabled={isTogglingLock}
                        title={note.isLocked ? "Déverrouiller la note" : "Verrouiller la note"}
                        className={note.isLocked ? "text-amber-500 hover:text-amber-500 hover:bg-amber-500/10" : ""}
                      >
                        {isTogglingLock ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : note.isLocked ? (
                          <LockOpen className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <DeleteNoteDialog
                      path={note.path}
                      sha={note.sha}
                      noteName={decodedSlug[decodedSlug.length - 1]}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Supprimer la note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                    {/* Export dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" title="Exporter">
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleCopyAll}>
                          {copied ? (
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          {copied ? "Copié !" : "Copier tout"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportMd}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Télécharger .md
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePrintPdf}>
                          <Printer className="h-4 w-4 mr-2" />
                          Imprimer / PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Mobile: dropdown menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild className="sm:hidden">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <RenameNoteDialog
                        path={note.path}
                        sha={note.sha}
                        currentName={decodedSlug[decodedSlug.length - 1]}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <TextCursorInput className="h-4 w-4 mr-2" />
                            Renommer
                          </DropdownMenuItem>
                        }
                      />
                      <MoveNoteDialog
                        path={note.path}
                        sha={note.sha}
                        noteName={decodedSlug[decodedSlug.length - 1]}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <FolderInput className="h-4 w-4 mr-2" />
                            Déplacer
                          </DropdownMenuItem>
                        }
                      />
                      {!isPathPrivate && (
                        <DropdownMenuItem
                          onClick={handleToggleLock}
                          disabled={isTogglingLock}
                        >
                          {isTogglingLock ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : note.isLocked ? (
                            <LockOpen className="h-4 w-4 mr-2" />
                          ) : (
                            <Lock className="h-4 w-4 mr-2" />
                          )}
                          {note.isLocked ? "Déverrouiller" : "Verrouiller"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleCopyAll}>
                        {copied ? (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        {copied ? "Copié !" : "Copier tout"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportMd}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Télécharger .md
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handlePrintPdf}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimer / PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DeleteNoteDialog
                        path={note.path}
                        sha={note.sha}
                        noteName={decodedSlug[decodedSlug.length - 1]}
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        }
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {isEditing && hasChanges && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-500">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Modifications non sauvegardées (Ctrl+S pour sauvegarder)
        </div>
      )}

      {/* Frontmatter badges */}
      {note.frontmatter && Object.keys(note.frontmatter).length > 0 && !isEditing && (
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
      <article>
        {isEditing ? (
          <MarkdownEditor
            content={editContent}
            onChange={setEditContent}
          />
        ) : (
          <MarkdownRenderer content={note.content} />
        )}
      </article>

      {/* Wikilinks / Backlinks section */}
      {!isEditing && note.wikilinks && note.wikilinks.length > 0 && (
        <div className="mt-12 pt-6 border-t border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Liens dans cette note ({note.wikilinks.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {note.wikilinks.map((link) => {
              // Encode each segment separately to preserve slashes
              const encodedLink = link
                .split("/")
                .map((s) => encodeURIComponent(s))
                .join("/");
              return (
                <Link
                  key={link}
                  href={`/note/${encodedLink}`}
                  className="text-sm text-primary hover:text-primary/80 hover:underline"
                >
                  [[{link}]]
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* PIN Dialog for verifying PIN when removing lock from note */}
      <PinDialog
        open={showUnlockPinDialog}
        onOpenChange={(open) => {
          if (!open) handleUnlockPinCancel();
        }}
        onSuccess={handleUnlockPinSuccess}
        mode="verify"
      />
    </div>
  );
}
