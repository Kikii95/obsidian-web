"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FileCode,
  Folder,
  FolderOpen,
  Image,
  Film,
  FileType,
  File,
  PanelLeftClose,
  PanelLeft,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getFileType, isViewableFile } from "@/lib/file-types";
import type { VaultFile } from "@/types";

interface TempVaultSidebarProps {
  owner: string;
  repo: string;
  tree: VaultFile[];
  branch?: string;
  rootPath?: string;
}

export function TempVaultSidebar({
  owner,
  repo,
  tree,
  branch,
  rootPath,
}: TempVaultSidebarProps) {
  const searchParams = useSearchParams();
  const currentPath = searchParams.get("path") || "";

  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Auto-expand path to current file
    const expanded = new Set<string>();
    if (currentPath) {
      const parts = currentPath.split("/");
      let path = "";
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        expanded.add(path);
      }
    }
    return expanded;
  });

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Filter tree by search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;

    const query = searchQuery.toLowerCase();

    const filterItems = (items: VaultFile[]): VaultFile[] => {
      return items
        .map((item) => {
          if (item.type === "dir") {
            const filteredChildren = filterItems(item.children || []);
            if (
              filteredChildren.length > 0 ||
              item.name.toLowerCase().includes(query)
            ) {
              return { ...item, children: filteredChildren };
            }
            return null;
          }

          if (item.name.toLowerCase().includes(query)) {
            return item;
          }
          return null;
        })
        .filter(Boolean) as VaultFile[];
    };

    return filterItems(tree);
  }, [tree, searchQuery]);

  // Build URL with query params
  const buildUrl = useCallback(
    (itemPath: string, isDir: boolean) => {
      const basePath = `/t/${owner}/${repo}`;
      const params = new URLSearchParams();

      if (isDir) {
        // For directories, use query param
        if (itemPath) params.set("path", itemPath);
        if (branch) params.set("branch", branch);
        if (rootPath) params.set("root", rootPath);
        return params.toString() ? `${basePath}?${params}` : basePath;
      }

      // For files, use route segments
      const fileType = getFileType(itemPath);
      const pathWithoutExt = itemPath
        .replace(/\.md$/, "")
        .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "")
        .replace(/\.pdf$/, "")
        .replace(/\.(mp4|webm|mov)$/i, "");

      if (fileType === "markdown") {
        if (branch) params.set("branch", branch);
        if (rootPath) params.set("root", rootPath);
        const query = params.toString() ? `?${params}` : "";
        return `${basePath}/note/${encodeURIComponent(pathWithoutExt)}${query}`;
      }

      if (fileType === "image" || fileType === "pdf" || fileType === "video") {
        if (branch) params.set("branch", branch);
        if (rootPath) params.set("root", rootPath);
        const query = params.toString() ? `?${params}` : "";
        return `${basePath}/file/${encodeURIComponent(pathWithoutExt)}${query}`;
      }

      // Code files: use code viewer route
      if (fileType === "code") {
        if (branch) params.set("branch", branch);
        if (rootPath) params.set("root", rootPath);
        const query = params.toString() ? `?${params}` : "";
        return `${basePath}/code/${encodeURIComponent(itemPath)}${query}`;
      }

      // Other files: just show in explorer
      return "#";
    },
    [owner, repo, branch, rootPath]
  );

  // Render tree item
  const renderItem = (item: VaultFile, depth: number = 0) => {
    const isDir = item.type === "dir";
    const isExpanded = expandedFolders.has(item.path);
    const isViewable = !isDir && isViewableFile(item.name);
    const fileType = getFileType(item.name);

    // Get icon based on type
    const Icon = isDir
      ? isExpanded
        ? FolderOpen
        : Folder
      : fileType === "markdown"
      ? FileText
      : fileType === "image"
      ? Image
      : fileType === "video"
      ? Film
      : fileType === "pdf"
      ? FileType
      : fileType === "code"
      ? FileCode
      : File;

    const iconColor = isDir
      ? "text-amber-500"
      : fileType === "markdown"
      ? "text-blue-500"
      : fileType === "image"
      ? "text-emerald-500"
      : fileType === "video"
      ? "text-purple-500"
      : fileType === "pdf"
      ? "text-red-500"
      : fileType === "code"
      ? "text-orange-500"
      : "text-muted-foreground";

    // Display name without extension for markdown
    const displayName =
      fileType === "markdown" ? item.name.replace(/\.md$/, "") : item.name;

    // Check if this is the current path
    const relativePath = item.path;
    const isActive = currentPath === relativePath;

    const content = (
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md text-sm",
          "hover:bg-muted/50 transition-colors cursor-pointer",
          isActive && "bg-primary/10 text-primary",
          !isViewable && !isDir && "opacity-50 cursor-not-allowed"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={isDir ? () => toggleFolder(item.path) : undefined}
      >
        {isDir && (
          <span className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        )}
        {!isDir && <span className="w-3.5" />}
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
        <span className="truncate">{displayName}</span>
      </div>
    );

    return (
      <div key={item.path}>
        {isDir ? (
          content
        ) : isViewable ? (
          <Link href={buildUrl(item.path, false)}>{content}</Link>
        ) : (
          content
        )}

        {/* Render children */}
        {isDir && isExpanded && item.children && (
          <div>
            {item.children
              .filter((child) => child.type === "dir" || isViewableFile(child.name))
              .map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Toggle button when sidebar is closed
  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed top-20 left-4 z-50 h-10 w-10 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30 bg-black/50 md:bg-black/20"
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-40 h-full w-72 border-r border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-sm truncate">
            {owner}/{repo}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Tree */}
        <ScrollArea className="h-[calc(100vh-130px)]">
          <div className="p-2">
            {filteredTree.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "No files found" : "Empty repository"}
              </p>
            ) : (
              filteredTree
                .filter((item) => item.type === "dir" || isViewableFile(item.name))
                .map((item) => renderItem(item))
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
