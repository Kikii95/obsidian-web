"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, Clock, Pencil, Save, X, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalLayout, SidebarHeader } from "@/components/layout";
import { ShareExportToolbar } from "@/components/shares/share-export-toolbar";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { TableOfContents } from "@/components/note/table-of-contents";
import { NoteStats } from "@/components/note/note-stats";
import type { VaultFile } from "@/types";
import type { ShareMode } from "@/types/shares";

interface ShareMetadata {
  folderPath: string;
  folderName: string;
  expiresAt: string;
  shareType: "folder" | "note";
  mode: ShareMode;
  allowCopy: boolean;
  allowExport: boolean;
}

interface NoteData {
  path: string;
  content: string;
  sha: string;
  frontmatter: Record<string, unknown>;
}

export default function ShareNotePage() {
  const params = useParams();
  const token = params.token as string;
  const pathSegments = params.path as string[];
  const relativePath = pathSegments.map(decodeURIComponent).join("/");

  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [note, setNote] = useState<NoteData | null>(null);
  const [tree, setTree] = useState<VaultFile[]>([]);
  const [shareFolderPath, setShareFolderPath] = useState<string>("");
  const [shareFolderName, setShareFolderName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch metadata
        const metaRes = await fetch(`/api/shares/${token}`);
        if (!metaRes.ok) {
          const data = await metaRes.json();
          if (data.expired) {
            setExpired(true);
            setError("Ce lien de partage a expiré");
          } else {
            setError(data.error || "Partage non trouvé");
          }
          setLoading(false);
          return;
        }
        const metaData = await metaRes.json();
        setMetadata(metaData.share);

        // Fetch tree (enables sidebar navigation and gives us correct folderPath)
        let effectiveFolderPath = metaData.share.folderPath;
        let effectiveFolderName = metaData.share.folderName;
        try {
          const treeRes = await fetch(`/api/shares/${token}/tree`);
          if (treeRes.ok) {
            const treeData = await treeRes.json();
            setTree(treeData.tree || []);
            if (treeData.folderPath !== undefined) {
              effectiveFolderPath = treeData.folderPath;
            }
            if (treeData.folderName) {
              effectiveFolderName = treeData.folderName;
            }
          }
        } catch {
          // Tree fetch failure is non-critical
        }
        setShareFolderPath(effectiveFolderPath);
        setShareFolderName(effectiveFolderName);

        // Build full path
        const fullPath = effectiveFolderPath
          ? `${effectiveFolderPath}/${relativePath}.md`
          : `${relativePath}.md`;

        // Fetch note
        const noteRes = await fetch(
          `/api/shares/${token}/file?path=${encodeURIComponent(fullPath)}`
        );
        if (!noteRes.ok) {
          const data = await noteRes.json();
          throw new Error(data.error || "Fichier non trouvé");
        }
        const noteData = await noteRes.json();
        setNote({
          path: noteData.path,
          content: noteData.content,
          sha: noteData.sha,
          frontmatter: noteData.frontmatter || {},
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, relativePath]);

  // Edit functions
  const startEdit = () => {
    setEditContent(note?.content || "");
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!note) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/shares/${token}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: note.path,
          content: editContent,
          sha: note.sha,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur de sauvegarde");
      }

      const data = await res.json();
      setNote({ ...note, content: editContent, sha: data.sha });
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Chargement de la note...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {expired ? (
            <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {expired ? "Lien expiré" : "Erreur"}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild variant="outline">
            <Link href={`/s/${token}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au dossier
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!metadata || !note) return null;

  const noteName = relativePath.split("/").pop() || relativePath;
  const displayFolderPath = shareFolderPath || metadata.folderPath;
  const displayFolderName = shareFolderName || metadata.folderName;
  const fullPath = `${displayFolderPath}/${relativePath}`;

  return (
    <UniversalLayout
      mode="share"
      tree={tree}
      currentPath={fullPath}
      metadata={{
        token,
        folderPath: displayFolderPath,
        folderName: displayFolderName,
        shareMode: metadata.mode,
        expiresAt: new Date(metadata.expiresAt),
        allowCopy: metadata.allowCopy,
        allowExport: metadata.allowExport,
        ownerName: "",
      }}
      permissions={{
        canEdit: metadata.mode === "writer",
        canCreate: metadata.mode === "writer",
        canDelete: false,
        canCopy: metadata.allowCopy,
        canExport: metadata.allowExport,
        canShare: false,
        isAuthenticated: false,
      }}
      sidebarHeader={
        <SidebarHeader
          title={displayFolderName || "Dossier partagé"}
          icon={<FolderOpen className="h-5 w-5 text-primary" />}
        />
      }
      showSidebar={tree.length > 0}
    >
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Back button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/s/${token}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        {/* Note header with title and actions */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">{noteName}</h1>
          <div className="flex items-center gap-2">
            {metadata.mode === "writer" && (
              isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>
                    <X className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              )
            )}
            {!isEditing && (
              <ShareExportToolbar
                content={note.content}
                fileName={noteName}
                contentRef={contentRef}
              />
            )}
          </div>
        </div>

        {/* Frontmatter tags if present */}
        {Array.isArray(note.frontmatter.tags) && note.frontmatter.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {(note.frontmatter.tags as string[]).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {saveError}
          </div>
        )}

        {/* Note stats & TOC */}
        {!isEditing && (
          <>
            <NoteStats content={note.content} className="mb-4" />
            <TableOfContents content={note.content} className="mb-6" />
          </>
        )}

        {/* Note content */}
        <div ref={contentRef} className="prose prose-neutral dark:prose-invert max-w-none">
          {isEditing ? (
            <div className="not-prose">
              <MarkdownEditor
                content={editContent}
                onChange={setEditContent}
              />
            </div>
          ) : (
            <MarkdownRenderer
              content={note.content}
              currentPath={note.path}
              isShareViewer={true}
            />
          )}
        </div>
      </div>
    </UniversalLayout>
  );
}
