"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  FolderOpen,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalLayout, SidebarHeader } from "@/components/layout/universal-layout";
import { ShareCreateNoteDialog } from "@/components/shares/share-create-note-dialog";
import { ShareCreateFolderDialog } from "@/components/shares/share-create-folder-dialog";
import { CopyToVaultDialog } from "@/components/shares/copy-to-vault-dialog";
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
  allowCopy: boolean;
  allowExport: boolean;
}

interface TreeResponse {
  tree: VaultFile[];
  folderPath: string;
  folderName: string;
  shareType: "folder" | "note";
  notePath?: string;
  includeSubfolders: boolean;
}

export default function ShareViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
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
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const refreshTree = () => setRefreshKey((k) => k + 1);

  // Fetch share data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
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

        if (metaData.share.mode === "deposit") {
          window.location.href = `/s/${token}/deposit`;
          return;
        }

        setMetadata(metaData.share);

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

  const displayFolderPath = treeFolderPath || metadata.folderPath;
  const displayFolderName = treeFolderName || metadata.folderName;
  const currentFolderPath = subPath
    ? `${displayFolderPath}/${subPath}`
    : displayFolderPath;

  const isWriter = metadata.mode === "writer";

  // Sidebar actions for writer mode
  const sidebarActions = isWriter ? (
    <div className="flex items-center gap-1">
      <ShareCreateNoteDialog
        token={token}
        currentPath={currentFolderPath}
        shareFolderPath={displayFolderPath}
        onCreated={refreshTree}
        trigger={
          <Button variant="outline" size="sm" className="flex-1">
            <FilePlus className="h-4 w-4 mr-1" />
            Note
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
            <Button variant="outline" size="sm" className="flex-1">
              <FolderPlus className="h-4 w-4 mr-1" />
              Dossier
            </Button>
          }
        />
      )}
    </div>
  ) : session && metadata.allowCopy ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCopyDialogOpen(true)}
      className="w-full"
    >
      <Copy className="h-4 w-4 mr-2" />
      Copier vers mon vault
    </Button>
  ) : null;

  return (
    <>
      <UniversalLayout
        mode="share"
        tree={tree}
        currentPath={currentFolderPath}
        metadata={{
          token,
          folderPath: displayFolderPath,
          folderName: displayFolderName,
          shareMode: metadata.mode,
          expiresAt: new Date(metadata.expiresAt),
          allowCopy: metadata.allowCopy,
          allowExport: metadata.allowExport,
          ownerName: "", // Not available in this context
        }}
        permissions={{
          canEdit: isWriter,
          canCreate: isWriter,
          canDelete: false,
          canCopy: metadata.allowCopy,
          canExport: metadata.allowExport,
          canShare: false,
          isAuthenticated: !!session,
        }}
        sidebarHeader={
          <SidebarHeader
            title={displayFolderName}
            icon={<FolderOpen className="h-5 w-5 text-primary" />}
          />
        }
        sidebarActions={sidebarActions}
      >
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Stats and actions */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {sortedContent.filter((f) => f.type === "dir").length} dossier(s) ·{" "}
              {sortedContent.filter((f) => f.type === "file").length} fichier(s)
            </p>

            {/* Creation buttons in main area (writer mode only) */}
            {isWriter && (
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
        </div>
      </UniversalLayout>

      {/* Copy to vault dialog */}
      <CopyToVaultDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        token={token}
        paths={[displayFolderPath]}
        shareFolderPath={displayFolderPath}
      />
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

  const getHref = () => {
    const relativePath = item.path.startsWith(shareFolderPath + "/")
      ? item.path.slice(shareFolderPath.length + 1)
      : item.name;

    if (isDirectory) {
      return `/s/${token}?path=${encodeURIComponent(relativePath)}`;
    }

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
      return "#";
    }
    return `/s/${token}/note/${encodedPath}`;
  };

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

  const displayName = (() => {
    if (isDirectory) return item.name;
    if (fileType === "markdown") return item.name.replace(/\.md$/, "");
    if (fileType === "canvas") return item.name.replace(/\.canvas$/, "");
    return item.name;
  })();

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
