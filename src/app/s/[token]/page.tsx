"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Folder,
  FileText,
  Image,
  File,
  ChevronRight,
  LayoutDashboard,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { ShareViewerHeader } from "@/components/shares/share-viewer-header";
import { ShareExportToolbar } from "@/components/shares/share-export-toolbar";
import { ShareSidebar } from "@/components/shares/share-sidebar";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";
import { getFileType, isViewableFile } from "@/lib/file-types";
import { cn } from "@/lib/utils";
import type { VaultFile } from "@/types";

interface NoteData {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

interface ShareMetadata {
  token: string;
  shareType: "folder" | "note";
  folderPath: string;
  folderName: string;
  includeSubfolders: boolean;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

interface TreeResponse {
  tree: VaultFile[];
  folderPath: string;
  folderName: string;
  includeSubfolders: boolean;
}

export default function ShareViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const subPath = searchParams.get("path") || "";

  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [tree, setTree] = useState<VaultFile[]>([]);
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch share data
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

        // If it's a note share, fetch the note directly
        if (metaData.share.shareType === "note") {
          const notePath = `${metaData.share.folderPath}.md`;
          const noteRes = await fetch(
            `/api/shares/${token}/file?path=${encodeURIComponent(notePath)}`
          );
          if (!noteRes.ok) {
            throw new Error("Erreur lors du chargement de la note");
          }
          const noteData = await noteRes.json();
          setNote({
            path: noteData.path,
            content: noteData.content,
            frontmatter: noteData.frontmatter || {},
          });
        } else {
          // Fetch tree for folder shares
          const treeRes = await fetch(`/api/shares/${token}/tree`);
          if (!treeRes.ok) {
            throw new Error("Erreur lors du chargement du contenu");
          }
          const treeData: TreeResponse = await treeRes.json();
          setTree(treeData.tree);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Get current folder content based on subPath
  const currentContent = useMemo(() => {
    if (!subPath) return tree;

    const findFolder = (files: VaultFile[], path: string[]): VaultFile[] | null => {
      if (path.length === 0) return files;

      const [current, ...rest] = path;
      const folder = files.find((f) => f.type === "dir" && f.name === current);

      if (!folder) return null;
      if (rest.length === 0) return folder.children || [];
      return findFolder(folder.children || [], rest);
    };

    return findFolder(tree, subPath.split("/"));
  }, [tree, subPath]);

  // Sort content
  const sortedContent = useMemo(() => {
    if (!currentContent) return [];
    return [...currentContent]
      .filter((f) => f.type === "dir" || isViewableFile(f.name))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentContent]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Chargement du contenu...</p>
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
            {expired ? "Lien expiré" : "Partage introuvable"}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">
            Demandez un nouveau lien à la personne qui vous l'a partagé.
          </p>
        </div>
      </div>
    );
  }

  if (!metadata) return null;

  // Note share: render note directly
  if (metadata.shareType === "note" && note) {
    return (
      <>
        <ShareViewerHeader
          token={token}
          folderName={metadata.folderName}
          folderPath={metadata.folderPath}
          expiresAt={metadata.expiresAt}
          isNote={true}
        />

        <main className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Note header with title and export */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">{metadata.folderName}</h1>
            <ShareExportToolbar
              content={note.content}
              fileName={metadata.folderName}
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

  // Folder share: render tree
  const currentFolderPath = subPath
    ? `${metadata.folderPath}/${subPath}`
    : metadata.folderPath;

  return (
    <>
      {/* Collapsible sidebar for folder navigation */}
      <ShareSidebar
        token={token}
        shareFolderPath={metadata.folderPath}
        tree={tree}
      />

      <ShareViewerHeader
        token={token}
        folderName={metadata.folderName}
        folderPath={metadata.folderPath}
        currentPath={subPath ? currentFolderPath : undefined}
        expiresAt={metadata.expiresAt}
      />

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Stats */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {sortedContent.filter((f) => f.type === "dir").length} dossier(s) ·{" "}
            {sortedContent.filter((f) => f.type === "file").length} fichier(s)
          </p>
        </div>

        {/* Content Grid */}
        {sortedContent.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Ce dossier est vide</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sortedContent.map((item) => (
              <ShareItem
                key={item.path}
                item={item}
                token={token}
                shareFolderPath={metadata.folderPath}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// Individual item component
function ShareItem({
  item,
  token,
  shareFolderPath,
}: {
  item: VaultFile;
  token: string;
  shareFolderPath: string;
}) {
  const isDirectory = item.type === "dir";
  const fileType = getFileType(item.name);

  // Build href
  const getHref = () => {
    // Get relative path from share folder
    const relativePath = item.path.startsWith(shareFolderPath + "/")
      ? item.path.slice(shareFolderPath.length + 1)
      : item.name;

    if (isDirectory) {
      return `/s/${token}?path=${encodeURIComponent(relativePath)}`;
    }

    // For files, route to appropriate viewer
    const pathWithoutExt = relativePath
      .replace(/\.md$/, "")
      .replace(/\.canvas$/, "")
      .replace(/\.pdf$/, "")
      .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");

    const encodedPath = encodeURIComponent(pathWithoutExt);

    if (fileType === "image" || fileType === "pdf") {
      return `/s/${token}/file/${encodedPath}`;
    }
    if (fileType === "canvas") {
      // Canvas not supported in share viewer yet
      return "#";
    }
    return `/s/${token}/note/${encodedPath}`;
  };

  // Get icon
  const getIcon = () => {
    if (isDirectory) {
      return <Folder className="h-5 w-5 text-primary/70" />;
    }
    switch (fileType) {
      case "image":
        return <Image className="h-5 w-5 text-emerald-500" />;
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "canvas":
        return <LayoutDashboard className="h-5 w-5 text-purple-500" />;
      case "markdown":
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Display name
  const displayName = (() => {
    if (isDirectory) return item.name;
    if (fileType === "markdown") return item.name.replace(/\.md$/, "");
    if (fileType === "canvas") return item.name.replace(/\.canvas$/, "");
    return item.name;
  })();

  // Child count for folders
  const childCount =
    isDirectory && item.children
      ? item.children.filter((c) => c.type === "dir" || isViewableFile(c.name))
          .length
      : 0;

  return (
    <Link
      href={getHref()}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-border/50",
        "hover:bg-muted/50 hover:border-border transition-all",
        "group"
      )}
    >
      <div
        className={cn(
          "p-2 rounded-lg transition-colors",
          isDirectory ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted/50"
        )}
      >
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{displayName}</p>
        {isDirectory && (
          <p className="text-xs text-muted-foreground">
            {childCount} élément{childCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
