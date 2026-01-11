"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareViewerHeader } from "@/components/shares/share-viewer-header";
import { ShareExportToolbar } from "@/components/shares/share-export-toolbar";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";

interface ShareMetadata {
  folderPath: string;
  folderName: string;
  expiresAt: string;
}

interface NoteData {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export default function ShareNotePage() {
  const params = useParams();
  const token = params.token as string;
  const pathSegments = params.path as string[];
  const relativePath = pathSegments.map(decodeURIComponent).join("/");

  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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

        // Build full path
        const fullPath = `${metaData.share.folderPath}/${relativePath}.md`;

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
  const fullPath = `${metadata.folderPath}/${relativePath}`;

  return (
    <>
      <ShareViewerHeader
        token={token}
        folderName={metadata.folderName}
        folderPath={metadata.folderPath}
        currentPath={fullPath}
        expiresAt={metadata.expiresAt}
      />

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Back button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/s/${token}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        {/* Note header with title and export */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">{noteName}</h1>
          <ShareExportToolbar
            content={note.content}
            fileName={noteName}
            contentRef={contentRef}
          />
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

        {/* Note content */}
        <div ref={contentRef} className="prose prose-neutral dark:prose-invert max-w-none">
          <MarkdownRenderer
            content={note.content}
            currentPath={note.path}
            isShareViewer={true}
          />
        </div>
      </main>
    </>
  );
}
