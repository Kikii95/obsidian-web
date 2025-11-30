"use client";

import { useMemo } from "react";
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
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVaultStore } from "@/lib/store";
import { decodeSlugSegments } from "@/lib/path-utils";
import { getFileType, isViewableFile } from "@/lib/file-types";
import { cn } from "@/lib/utils";
import type { VaultFile } from "@/types";

export default function FolderPage() {
  const params = useParams();
  const { tree } = useVaultStore();

  // Parse slug
  const slug = params.slug as string[];
  const decodedSlug = useMemo(() => decodeSlugSegments(slug || []), [slug]);
  const folderPath = decodedSlug.join("/");
  const folderName = decodedSlug[decodedSlug.length - 1] || "Root";

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
    const crumbs = [{ name: "Vault", path: "/" }];
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

  // Sort content: folders first, then files alphabetically
  const sortedContent = useMemo(() => {
    if (!folderContent) return [];

    return [...folderContent]
      .filter(f => f.type === "dir" || isViewableFile(f.name))
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "dir" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [folderContent]);

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
                  className="hover:text-foreground transition-colors"
                >
                  {i === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{folderName}</h1>
            <p className="text-sm text-muted-foreground">
              {stats.folders} dossier{stats.folders > 1 ? "s" : ""} · {stats.files} fichier{stats.files > 1 ? "s" : ""}
            </p>
          </div>
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
              <FolderItem
                key={item.path}
                item={item}
                basePath={folderPath}
              />
            ))}
          </div>
        )}
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
