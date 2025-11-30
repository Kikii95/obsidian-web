"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useVaultStore } from "@/lib/store";
import { getFileType, isViewableFile } from "@/lib/file-types";
import {
  File,
  Folder,
  Image,
  FileText,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VaultFile } from "@/types";

interface FlatFile {
  name: string;
  path: string;
  type: "file" | "dir";
  fileType: string;
}

// Flatten tree to searchable list
function flattenTree(files: VaultFile[], result: FlatFile[] = []): FlatFile[] {
  for (const file of files) {
    if (file.type === "dir") {
      result.push({
        name: file.name,
        path: file.path,
        type: "dir",
        fileType: "folder",
      });
      if (file.children) {
        flattenTree(file.children, result);
      }
    } else if (isViewableFile(file.name)) {
      result.push({
        name: file.name,
        path: file.path,
        type: "file",
        fileType: getFileType(file.name),
      });
    }
  }
  return result;
}

// Get display name without extension
function getDisplayName(name: string, fileType: string): string {
  if (fileType === "markdown") return name.replace(/\.md$/, "");
  if (fileType === "canvas") return name.replace(/\.canvas$/, "");
  return name;
}

// Get route for file
function getRoute(path: string, fileType: string): string {
  const pathWithoutExt = path
    .replace(/\.md$/, "")
    .replace(/\.canvas$/, "")
    .replace(/\.pdf$/, "")
    .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");
  const encodedPath = pathWithoutExt
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");

  if (fileType === "folder") return `/folder/${encodedPath}`;
  if (fileType === "image" || fileType === "pdf") return `/file/${encodedPath}`;
  if (fileType === "canvas") return `/canvas/${encodedPath}`;
  return `/note/${encodedPath}`;
}

// Get icon for file type
function FileIcon({ fileType }: { fileType: string }) {
  switch (fileType) {
    case "folder":
      return <Folder className="h-4 w-4 text-primary/70" />;
    case "image":
      return <Image className="h-4 w-4 text-emerald-500" />;
    case "pdf":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "canvas":
      return <LayoutDashboard className="h-4 w-4 text-purple-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

export function QuickSwitcher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { tree } = useVaultStore();

  // Flatten tree once
  const allFiles = useMemo(() => flattenTree(tree), [tree]);

  // Filter files by query
  const filteredFiles = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 20); // Show first 20 if no query
    const lowerQuery = query.toLowerCase();
    return allFiles
      .filter(
        (f) =>
          f.name.toLowerCase().includes(lowerQuery) ||
          f.path.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 20); // Limit results
  }, [allFiles, query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredFiles]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (file: FlatFile) => {
      const route = getRoute(file.path, file.fileType);
      router.push(route);
      setOpen(false);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredFiles.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredFiles[selectedIndex]) {
            handleSelect(filteredFiles[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [filteredFiles, selectedIndex, handleSelect]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une note..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto py-2"
        >
          {filteredFiles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun résultat pour "{query}"
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <button
                key={file.path}
                onClick={() => handleSelect(file)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <FileIcon fileType={file.fileType} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {getDisplayName(file.name, file.fileType)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {file.path}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-muted">↑↓</kbd> naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-muted">↵</kbd> ouvrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-muted">esc</kbd> fermer
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
