"use client";

import { useRef, useCallback, memo, useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Lock,
  Image,
  FileText,
  LayoutDashboard,
  ExternalLink,
  Pin,
  PinOff,
  Square,
  CheckSquare,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { CreateFolderDialog } from "@/components/notes/create-folder-dialog";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settings-store";
import { usePinnedStore } from "@/lib/pinned-store";
import { useSelectionStore } from "@/lib/selection-store";
import { getFileType } from "@/lib/file-types";
import { useFlattenedTree, type FlatTreeItem } from "@/hooks/use-flattened-tree";
import type { VaultFile } from "@/types";

const ITEM_HEIGHT = 32; // Fixed height for each row

// Context for folder actions (create note/folder in-place)
interface FolderActionsContextType {
  createNoteIn: (folderPath: string) => void;
  createFolderIn: (folderPath: string) => void;
}

const FolderActionsContext = createContext<FolderActionsContextType | null>(null);

function useFolderActions() {
  const ctx = useContext(FolderActionsContext);
  if (!ctx) throw new Error("useFolderActions must be used within FolderActionsProvider");
  return ctx;
}

interface VirtualFileTreeProps {
  files: VaultFile[];
}

export function VirtualFileTree({ files }: VirtualFileTreeProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { expandedFolders } = useVaultStore();

  // State for in-place creation dialogs
  const [createNoteFolder, setCreateNoteFolder] = useState<string | null>(null);
  const [createFolderParent, setCreateFolderParent] = useState<string | null>(null);

  // Flatten tree based on expanded folders
  const flatItems = useFlattenedTree(files, expandedFolders);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 10, // Render 10 extra items above/below viewport
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Stable callbacks for context
  const createNoteIn = useCallback((folderPath: string) => {
    setCreateNoteFolder(folderPath);
  }, []);

  const createFolderIn = useCallback((folderPath: string) => {
    setCreateFolderParent(folderPath);
  }, []);

  return (
    <FolderActionsContext.Provider value={{ createNoteIn, createFolderIn }}>
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ contain: "strict" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            minWidth: "100%",
            width: "max-content",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = flatItems[virtualRow.index];
            return (
              <div
                key={item.file.path}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  minWidth: "100%",
                  width: "max-content",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <VirtualTreeItem item={item} />
              </div>
            );
          })}
        </div>
      </div>

      {/* In-place creation dialogs */}
      <CreateNoteDialog
        currentFolder={createNoteFolder || undefined}
        open={createNoteFolder !== null}
        onOpenChange={(open) => !open && setCreateNoteFolder(null)}
      />
      <CreateFolderDialog
        defaultParent={createFolderParent || undefined}
        open={createFolderParent !== null}
        onOpenChange={(open) => !open && setCreateFolderParent(null)}
      />
    </FolderActionsContext.Provider>
  );
}

// Memoized individual item component
const VirtualTreeItem = memo(function VirtualTreeItem({
  item,
}: {
  item: FlatTreeItem;
}) {
  const { file, depth, isExpanded, isPrivateFolder } = item;
  const pathname = usePathname();
  const { toggleFolder } = useVaultStore();
  const { settings } = useSettingsStore();
  const { isSelectionMode, isSelected, toggleItem } = useSelectionStore();
  const { createNoteIn, createFolderIn } = useFolderActions();

  const isDirectory = file.type === "dir";
  const fileType = getFileType(file.name);
  const showFileIcons = settings.showFileIcons ?? true;

  // Build the URL path for this file
  const getFilePath = useCallback(
    (filePath: string) => {
      const pathWithoutExt = filePath
        .replace(/\.md$/, "")
        .replace(/\.canvas$/, "")
        .replace(/\.pdf$/, "")
        .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");
      const encodedPath = pathWithoutExt
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      if (fileType === "image" || fileType === "pdf") {
        return `/file/${encodedPath}`;
      }
      if (fileType === "canvas") {
        return `/canvas/${encodedPath}`;
      }
      return `/note/${encodedPath}`;
    },
    [fileType]
  );

  const filePath = getFilePath(file.path);
  const isActive = pathname === filePath;

  // Get icon based on file type
  const icon = (() => {
    if (isDirectory) {
      // Private folder with hidden children shows lock icon
      if (isPrivateFolder) {
        return <Lock className="h-4 w-4 text-amber-500" />;
      }
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-primary/70" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground" />
      );
    }
    // If icons disabled, show generic file icon
    if (!showFileIcons) {
      return <File className="h-4 w-4 text-muted-foreground" />;
    }
    switch (fileType) {
      case "image":
        return <Image className="h-4 w-4 text-emerald-500" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "canvas":
        return <LayoutDashboard className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  })();

  // Get display name
  const displayName = (() => {
    if (fileType === "markdown") return file.name.replace(/\.md$/, "");
    if (fileType === "canvas") return file.name.replace(/\.canvas$/, "");
    return file.name;
  })();

  // Render indent guides
  const indentGuides = depth > 0 && (
    <div className="flex shrink-0 self-stretch">
      {Array.from({ length: depth }).map((_, i) => (
        <div key={i} className="w-4 flex justify-center">
          <div className="w-px bg-border/40 min-h-[24px]" />
        </div>
      ))}
    </div>
  );

  // Selection checkbox component
  const itemSelected = isSelected(file.path);
  const SelectionCheckbox = isSelectionMode ? (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleItem({ path: file.path, name: file.name, type: isDirectory ? "dir" : "file" });
      }}
      className={cn(
        "shrink-0 p-0.5 rounded transition-colors",
        itemSelected ? "text-primary" : "text-muted-foreground hover:text-primary"
      )}
    >
      {itemSelected ? (
        <CheckSquare className="h-4 w-4" />
      ) : (
        <Square className="h-4 w-4" />
      )}
    </button>
  ) : null;

  // Pin functionality (available for files AND directories)
  const { pinItem, unpinItem, isPinned: checkPinned } = usePinnedStore();
  const isPinned = checkPinned(file.path);
  const canPin = isDirectory || ["markdown", "image", "pdf", "canvas"].includes(fileType);

  const handleTogglePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPinned) {
      unpinItem(file.path);
    } else {
      pinItem(file.path, displayName, isDirectory ? "folder" : "note");
    }
  };

  if (isDirectory) {
    // Build folder explorer URL
    const folderHref = `/folder/${file.path.split("/").map(s => encodeURIComponent(s)).join("/")}`;

    // Private folder with hidden children - link to folder page for unlock
    if (isPrivateFolder) {
      return (
        <div className="flex items-center w-full h-full">
          {isSelectionMode && (
            <div className="pl-2 shrink-0">{SelectionCheckbox}</div>
          )}
          <Link
            href={isSelectionMode ? "#" : folderHref}
            onClick={(e) => {
              if (isSelectionMode) {
                e.preventDefault();
                toggleItem({ path: file.path, name: file.name, type: "dir" });
              }
            }}
            className={cn(
              "flex items-center gap-1 flex-1 h-full px-2 text-sm rounded-md transition-colors overflow-hidden",
              "hover:bg-amber-500/10 text-amber-600 dark:text-amber-400",
              isSelectionMode && itemSelected && "bg-primary/10"
            )}
            title="Déverrouiller pour voir le contenu"
          >
            {indentGuides}
            {!isSelectionMode && <div className="w-3 shrink-0" />}
            <span className="shrink-0">{icon}</span>
            <span className="truncate font-medium">{displayName}</span>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex items-center w-full h-full group">
        {isSelectionMode && (
          <div className="pl-2 shrink-0">{SelectionCheckbox}</div>
        )}
        <button
          onClick={() => {
            // In selection mode: toggle expand AND select
            // In normal mode: just toggle expand
            toggleFolder(file.path);
            if (isSelectionMode) {
              toggleItem({ path: file.path, name: file.name, type: "dir" });
            }
          }}
          className={cn(
            "flex items-center gap-1 flex-1 h-full px-2 text-sm rounded-md transition-colors overflow-hidden",
            "hover:bg-muted/50 text-left",
            isExpanded && "text-foreground",
            !isExpanded && "text-muted-foreground",
            isSelectionMode && itemSelected && "bg-primary/10"
          )}
        >
          {indentGuides}
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
          <span className="shrink-0">{icon}</span>
          <span className="truncate font-medium">{displayName}</span>
          {file.isLocked && (
            <Lock className="h-3.5 w-3.5 ml-1 shrink-0 text-amber-500" />
          )}
          {isPinned && (
            <Pin className="h-3 w-3 ml-1 shrink-0 text-primary" />
          )}
        </button>
        {/* Folder action buttons - hidden by default, visible on hover */}
        {!isSelectionMode && (
          <div className="flex items-center shrink-0">
            {/* Create note in folder */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                createNoteIn(file.path);
              }}
              className={cn(
                "p-1 rounded transition-all",
                "opacity-0 group-hover:opacity-100",
                "hover:bg-primary/20 text-muted-foreground hover:text-primary"
              )}
              title="Nouvelle note ici"
            >
              <FilePlus className="h-3 w-3" />
            </button>
            {/* Create subfolder */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                createFolderIn(file.path);
              }}
              className={cn(
                "p-1 rounded transition-all",
                "opacity-0 group-hover:opacity-100",
                "hover:bg-primary/20 text-muted-foreground hover:text-primary"
              )}
              title="Nouveau dossier ici"
            >
              <FolderPlus className="h-3 w-3" />
            </button>
            {/* Pin button */}
            <button
              onClick={handleTogglePin}
              className={cn(
                "p-1 rounded transition-all",
                isPinned
                  ? "hover:bg-primary/20 text-primary"
                  : "opacity-0 group-hover:opacity-100 hover:bg-primary/20 text-muted-foreground hover:text-primary"
              )}
              title={isPinned ? "Désépingler" : "Épingler"}
            >
              {isPinned ? (
                <PinOff className="h-3 w-3" />
              ) : (
                <Pin className="h-3 w-3" />
              )}
            </button>
            {/* Folder explorer button */}
            <Link
              href={folderHref}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "p-1 mr-1 rounded transition-all",
                "opacity-0 group-hover:opacity-100",
                "hover:bg-primary/20 text-muted-foreground hover:text-primary"
              )}
              title="Ouvrir l'explorateur"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // In selection mode, clicking selects instead of navigating
  if (isSelectionMode) {
    return (
      <div className="flex items-center w-full h-full group">
        <div className="pl-2 shrink-0">{SelectionCheckbox}</div>
        <button
          onClick={() => toggleItem({ path: file.path, name: file.name, type: "file" })}
          className={cn(
            "flex items-center gap-1 flex-1 h-full px-2 text-sm rounded-md transition-all overflow-hidden",
            "hover:bg-muted/50 text-left",
            itemSelected
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {indentGuides}
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{displayName}</span>
          {file.isLocked && (
            <Lock className="h-3.5 w-3.5 ml-1 shrink-0 text-amber-500" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full h-full group">
      <Link
        href={filePath}
        className={cn(
          "flex items-center gap-1 flex-1 h-full px-2 text-sm rounded-md transition-all overflow-hidden",
          "hover:bg-muted/50",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {indentGuides}
        <div className="w-4 shrink-0" />
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{displayName}</span>
        {file.isLocked && (
          <Lock className="h-3.5 w-3.5 ml-1 shrink-0 text-amber-500" />
        )}
        {isPinned && (
          <Pin className="h-3 w-3 ml-1 shrink-0 text-primary" />
        )}
      </Link>
      {/* Pin button - hidden by default, visible on hover */}
      {canPin && (
        <button
          onClick={handleTogglePin}
          className={cn(
            "p-1 mr-1 rounded transition-all",
            isPinned
              ? "hover:bg-primary/20 text-primary"
              : "opacity-0 group-hover:opacity-100 hover:bg-primary/20 text-muted-foreground hover:text-primary"
          )}
          title={isPinned ? "Désépingler" : "Épingler"}
        >
          {isPinned ? (
            <PinOff className="h-3 w-3" />
          ) : (
            <Pin className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
});
