"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/lib/store";
import { Search, FileText, Folder } from "lucide-react";
import type { VaultFile } from "@/types";

interface NotePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  title?: string;
  currentPath?: string | null;
}

// Flatten tree to list of markdown files
function flattenTree(items: VaultFile[], result: VaultFile[] = []): VaultFile[] {
  for (const item of items) {
    if (item.type === "file" && item.path.endsWith(".md")) {
      result.push(item);
    } else if (item.type === "dir" && item.children) {
      flattenTree(item.children, result);
    }
  }
  return result;
}

export function NotePicker({
  open,
  onOpenChange,
  onSelect,
  title = "Select a note",
  currentPath,
}: NotePickerProps) {
  const { tree } = useVaultStore();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Flatten and filter notes (limit increased for large vaults)
  const notes = useMemo(() => {
    const allNotes = flattenTree(tree);
    if (!search.trim()) return allNotes.slice(0, 200);

    const query = search.toLowerCase();
    return allNotes
      .filter((note) => {
        const name = note.name.toLowerCase();
        const path = note.path.toLowerCase();
        return name.includes(query) || path.includes(query);
      })
      .slice(0, 200);
  }, [tree, search]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelect = useCallback(
    (note: VaultFile) => {
      const notePath = note.path.replace(/\.md$/, "");
      onSelect(notePath);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, notes.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && notes[selectedIndex]) {
        e.preventDefault();
        handleSelect(notes[selectedIndex]);
      }
    },
    [notes, selectedIndex, handleSelect]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-medium">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="h-64 px-2 pb-2">
          {notes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notes found
            </div>
          ) : (
            <div className="space-y-0.5">
              {notes.map((note, index) => {
                const notePath = note.path.replace(/\.md$/, "");
                const isSelected = index === selectedIndex;
                const isCurrent = currentPath === notePath;
                const folder = notePath.includes("/")
                  ? notePath.split("/").slice(0, -1).join("/")
                  : null;

                return (
                  <button
                    key={note.path}
                    onClick={() => handleSelect(note)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                      "hover:bg-muted/50",
                      isSelected && "bg-muted",
                      isCurrent && "opacity-50"
                    )}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">
                        {note.name.replace(/\.md$/, "")}
                      </div>
                      {folder && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Folder className="h-3 w-3" />
                          <span className="truncate">{folder}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
