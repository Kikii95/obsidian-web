"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  Home,
  Image,
  LayoutDashboard,
  File,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVaultStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settings-store";
import { useLockStore } from "@/lib/lock-store";
import { decodeSlugSegments } from "@/lib/path-utils";
import { getFileType, isViewableFile } from "@/lib/file-types";
import { cn } from "@/lib/utils";
import { ReorderFoldersDialog } from "@/components/notes/reorder-folders-dialog";
import type { VaultFile } from "@/types";

// Check if folder name indicates a private folder
function isPrivateFolderName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName === "_private" || lowerName.startsWith("_private.");
}

export default function FolderPage() {
  const params = useParams();
  const { tree } = useVaultStore();
  const { getFolderOrder, settings } = useSettingsStore();
  const { hasPinConfigured, isUnlocked } = useLockStore();
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);

  // Should we hide children of _private folders?
  const hidePrivateChildren =
    settings.requirePinOnPrivateFolder &&
    hasPinConfigured &&
    !isUnlocked;

  // Parse slug
  const slug = params.slug as string[];
  const decodedSlug = useMemo(() => decodeSlugSegments(slug || []), [slug]);
  const folderPath = decodedSlug.join("/");
  const folderName = decodedSlug[decodedSlug.length - 1] || "Root";

  // Check if this is a _private folder that should be locked
  const isPrivateFolder = isPrivateFolderName(folderName);
  const shouldHideContent = isPrivateFolder && hidePrivateChildren;

  // Find the folder in the tree
  const folderContent = useMemo(() => {
    if (!folderPath) return tree;

    const findFolder = (files: VaultFile[], path: string[]): VaultFile[] | null => {
      if (path.length === 0) return files;

      const [current, ...rest] = path;
      const folder = files.find(f => f.type === "dir" && f.name === current);

      if (!folder) return null;
      if (rest.length === 0) return folder.children || [];
      return findFolder(folder.children || [], rest);
    };

    return findFolder(tree, decodedSlug);
  }, [tree, folderPath, decodedSlug]);

  // Build breadcrumb
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ name: "Vault", path: "/folder" }];
    let currentPath = "";

    for (const segment of decodedSlug) {
      currentPath += (currentPath ? "/" : "") + segment;
      crumbs.push({
        name: segment,
        path: `/folder/${currentPath.split("/").map(s => encodeURIComponent(s)).join("/")}`,
      });
    }

    return crumbs;
  }, [decodedSlug]);

  // Sort content: folders first (with custom order), then files alphabetically
  const sortedContent = useMemo(() => {
    if (!folderContent) return [];

    const customOrder = getFolderOrder(folderPath);

    return [...folderContent]
      .filter(f => f.type === "dir" || isViewableFile(f.name))
      .sort((a, b) => {
        // Folders first
        if (a.type !== b.type) {
          return a.type === "dir" ? -1 : 1;
        }

        // Apply custom order for folders
        if (a.type === "dir" && b.type === "dir" && customOrder.length > 0) {
          const aIndex = customOrder.indexOf(a.name);
          const bIndex = customOrder.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
        }

        return a.name.localeCompare(b.name);
      });
  }, [folderContent, folderPath, getFolderOrder]);

  // Stats
  const stats = useMemo(() => {
    const folders = sortedContent.filter(f => f.type === "dir").length;
    const files = sortedContent.filter(f => f.type === "file").length;
    return { folders, files, total: folders + files };
  }, [sortedContent]);

  if (!folderContent) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Dossier introuvable</h1>
          <p className="text-muted-foreground mb-6">
            Le dossier <code className="bg-muted px-2 py-1 rounded">{folderPath}</code> n'existe pas.
          </p>
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Retour au vault
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.name}</span>
              ) : (
                <Link
                  href={crumb.path}
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                  title={i === 0 ? "Vault" : undefined}
                >
                  {i === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={cn(
            "p-3 rounded-xl",
            isPrivateFolder ? "bg-amber-500/10" : "bg-primary/10"
          )}>
            {isPrivateFolder ? (
              <Lock className="h-8 w-8 text-amber-500" />
            ) : (
              <FolderOpen className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{folderName}</h1>
            {shouldHideContent ? (
              <p className="text-sm text-amber-500">Dossier verrouillé</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {stats.folders} dossier{stats.folders > 1 ? "s" : ""} · {stats.files} fichier{stats.files > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {!shouldHideContent && stats.folders > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReorderDialogOpen(true)}
              title="Réorganiser les dossiers"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Ordre
            </Button>
          )}
        </div>

        {/* Content Grid */}
        {shouldHideContent ? (
          <div className="text-center py-12 border border-dashed border-amber-500/30 rounded-lg bg-amber-500/5">
            <Lock className="h-12 w-12 mx-auto text-amber-500 mb-3" />
            <p className="text-amber-600 dark:text-amber-400 font-medium mb-2">
              Contenu verrouillé
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Déverrouillez votre vault pour voir le contenu de ce dossier
            </p>
            <p className="text-xs text-muted-foreground">
              Cliquez sur le cadenas dans le header pour déverrouiller
            </p>
          </div>
        ) : sortedContent.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Ce dossier est vide</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sortedContent.map((item) => (
              <FolderItem
                key={item.path}
                item={item}
                basePath={folderPath}
              />
            ))}
          </div>
        )}

        {/* Reorder folders dialog */}
        <ReorderFoldersDialog
          open={reorderDialogOpen}
          onOpenChange={setReorderDialogOpen}
          parentPath={folderPath}
          folders={folderContent || []}
        />
      </div>
    </div>
  );
}

// Individual item component
function FolderItem({ item, basePath }: { item: VaultFile; basePath: string }) {
  const isDirectory = item.type === "dir";
  const fileType = getFileType(item.name);

  // Build href
  const getHref = () => {
    if (isDirectory) {
      const path = basePath ? `${basePath}/${item.name}` : item.name;
      return `/folder/${path.split("/").map(s => encodeURIComponent(s)).join("/")}`;
    }

    // File path without extension
    const pathWithoutExt = item.path
      .replace(/\.md$/, "")
      .replace(/\.canvas$/, "")
      .replace(/\.pdf$/, "")
      .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");

    const encodedPath = pathWithoutExt
      .split("/")
      .map(s => encodeURIComponent(s))
      .join("/");

    if (fileType === "image" || fileType === "pdf") {
      return `/file/${encodedPath}`;
    }
    if (fileType === "canvas") {
      return `/canvas/${encodedPath}`;
    }
    return `/note/${encodedPath}`;
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
  const childCount = isDirectory && item.children
    ? item.children.filter(c => c.type === "dir" || isViewableFile(c.name)).length
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
      <div className={cn(
        "p-2 rounded-lg transition-colors",
        isDirectory ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted/50"
      )}>
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
