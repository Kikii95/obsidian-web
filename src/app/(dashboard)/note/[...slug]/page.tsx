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
  CloudOff,
  Trash2,
  FolderInput,
  TextCursorInput,
} from "lucide-react";
import Link from "next/link";
import { cacheNote, getCachedNote } from "@/lib/note-cache";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { MoveNoteDialog } from "@/components/notes/move-note-dialog";
import { RenameNoteDialog } from "@/components/notes/rename-note-dialog";

interface NoteData {
  path: string;
  content: string;
  sha: string;
  frontmatter: Record<string, unknown>;
  wikilinks: string[];
}

export default function NotePage() {
  const params = useParams();
  const { isOnline } = useOnlineStatus();
  const [note, setNote] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Build the file path from slug (decode each segment)
  const slug = params.slug as string[];
  const decodedSlug = slug?.map((s) => decodeURIComponent(s)) || [];
  const filePath = decodedSlug.length > 0 ? `${decodedSlug.join("/")}.md` : "";

  const fetchNote = async () => {
    if (!filePath) return;

    setIsLoading(true);
    setError(null);
    setIsPrivate(false);
    setIsFromCache(false);

    try {
      // Try to fetch from API first if online
      if (isOnline) {
        const response = await fetch(
          `/api/github/read?path=${encodeURIComponent(filePath)}`
        );
        const data = await response.json();

        if (!response.ok) {
          // Check if note is private (403)
          if (response.status === 403) {
            setIsPrivate(true);
          }
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
      if (isOnline && !isPrivate) {
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

  useEffect(() => {
    fetchNote();
  }, [filePath]);

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
    // Special display for private notes
    if (isPrivate) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="relative">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <Lock className="h-5 w-5 text-amber-500 absolute -bottom-1 -right-1" />
            </div>
            <h2 className="text-xl font-semibold">Note privée</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Cette note est marquée comme privée et ne peut pas être affichée.
            </p>
            <div className="text-xs text-muted-foreground/60 bg-muted/50 px-3 py-2 rounded-md">
              <code>#private</code> ou <code>private: true</code> dans le
              frontmatter
            </div>
            <Button variant="ghost" asChild>
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </div>
        </div>
      );
    }

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
    <div className={`p-6 mx-auto ${isEditing ? "max-w-6xl" : "max-w-4xl"}`}>
      {/* Header with breadcrumb and actions */}
      <div className="flex items-start justify-between gap-4 mb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">
            Vault
          </Link>
          {breadcrumbs?.map((crumb) => (
            <div key={crumb.path} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {crumb.isLast ? (
                <span className="text-foreground font-medium">{crumb.name}</span>
              ) : (
                <span className="text-muted-foreground">
                  {crumb.name}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Edit/View/Save buttons */}
        <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
}
