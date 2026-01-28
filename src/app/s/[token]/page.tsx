"use client";

import { useEffect, useState, useMemo } from "react";
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
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareViewerHeader } from "@/components/shares/share-viewer-header";
import { ShareSidebar } from "@/components/shares/share-sidebar";
import { ShareCreateNoteDialog } from "@/components/shares/share-create-note-dialog";
import { ShareCreateFolderDialog } from "@/components/shares/share-create-folder-dialog";
import { getFileType, isViewableFile } from "@/lib/file-types";
import { cn } from "@/lib/utils";
import type { VaultFile } from "@/types";
import type { ShareMode } from "@/types/shares";

interface ShareMetadata {
  token: string;
  shareType: "folder" | "note";
  folderPath: string;
  folderName: string;
  includeSubfolders: boolean;
  mode: ShareMode;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

interface TreeResponse {
  tree: VaultFile[];
  folderPath: string;
  folderName: string;
  shareType: "folder" | "note";
  notePath?: string; // For note shares, the full path to the note
  includeSubfolders: boolean;
}

export default function ShareViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const subPath = searchParams.get("path") || "";

  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [tree, setTree] = useState<VaultFile[]>([]);
  const [treeFolderPath, setTreeFolderPath] = useState<string>("");
  const [treeFolderName, setTreeFolderName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh tree function (called after create operations)
  const refreshTree = () => setRefreshKey((k) => k + 1);

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

        // Redirect to deposit page if mode is deposit
        if (metaData.share.mode === "deposit") {
          window.location.href = `/s/${token}/deposit`;
          return;
        }

        setMetadata(metaData.share);

        // Always fetch tree (API handles both folder and note shares now)
        const treeRes = await fetch(`/api/shares/${token}/tree`);
        if (!treeRes.ok) {
          throw new Error("Erreur lors du chargement du contenu");
        }
        const treeData: TreeResponse = await treeRes.json();
        setTree(treeData.tree);
        setTreeFolderPath(treeData.folderPath);
        setTreeFolderName(treeData.folderName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, refreshKey]);

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

  // Unified explorer view for both folder and note shares
  // For note shares, treeFolderPath is the parent folder
  const displayFolderPath = treeFolderPath || metadata.folderPath;
  const displayFolderName = treeFolderName || metadata.folderName;
  const currentFolderPath = subPath
    ? `${displayFolderPath}/${subPath}`
    : displayFolderPath;

  return (
    <>
      {/* Collapsible sidebar for navigation */}
      <ShareSidebar
        token={token}
        shareFolderPath={displayFolderPath}
        tree={tree}
        mode={metadata.mode}
        includeSubfolders={metadata.includeSubfolders}
        currentPath={currentFolderPath}
        onTreeRefresh={refreshTree}
      />

      <ShareViewerHeader
        token={token}
        folderName={displayFolderName}
        folderPath={displayFolderPath}
        currentPath={subPath ? currentFolderPath : undefined}
        expiresAt={metadata.expiresAt}
        isNote={metadata.shareType === "note"}
      />

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Stats and actions */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {sortedContent.filter((f) => f.type === "dir").length} dossier(s) ·{" "}
            {sortedContent.filter((f) => f.type === "file").length} fichier(s)
          </p>

          {/* Creation buttons (writer mode only) */}
          {metadata.mode === "writer" && (
            <div className="flex items-center gap-2">
              <ShareCreateNoteDialog
                token={token}
                currentPath={currentFolderPath}
                shareFolderPath={displayFolderPath}
                onCreated={refreshTree}
                trigger={
                  <Button variant="outline" size="sm">
                    <FilePlus className="h-4 w-4 mr-2" />
                    Nouvelle note
                  </Button>
                }
              />
              {metadata.includeSubfolders && (
                <ShareCreateFolderDialog
                  token={token}
                  currentPath={currentFolderPath}
                  shareFolderPath={displayFolderPath}
                  onCreated={refreshTree}
                  trigger={
                    <Button variant="outline" size="sm">
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Nouveau dossier
                    </Button>
                  }
                />
              )}
            </div>
          )}
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
                shareFolderPath={displayFolderPath}
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
