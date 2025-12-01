"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/settings-store";
import { ChevronUp, ChevronDown, GripVertical, RotateCcw, Check } from "lucide-react";
import type { VaultFile } from "@/types";

interface ReorderFoldersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath: string; // "" for root
  folders: VaultFile[]; // Folders at this level
}

export function ReorderFoldersDialog({
  open,
  onOpenChange,
  parentPath,
  folders,
}: ReorderFoldersDialogProps) {
  const { getFolderOrder, setFolderOrder, clearFolderOrder } = useSettingsStore();

  // Get folder names only (dirs) - with defensive check
  const folderNames = (Array.isArray(folders) ? folders : [])
    .filter((f) => f && f.type === "dir" && typeof f.name === "string")
    .map((f) => f.name);

  // Local state for reordering
  const [order, setOrder] = useState<string[]>([]);

  // Initialize order from settings or default alphabetical
  useEffect(() => {
    if (open) {
      try {
        const savedOrder = getFolderOrder(parentPath);
        // Defensive: ensure savedOrder is an array of strings
        const validSavedOrder = Array.isArray(savedOrder)
          ? savedOrder.filter((item) => typeof item === "string")
          : [];

        if (validSavedOrder.length > 0) {
          // Merge saved order with current folders (handle new/deleted folders)
          const merged = [
            ...validSavedOrder.filter((name) => folderNames.includes(name)),
            ...folderNames.filter((name) => !validSavedOrder.includes(name)),
          ];
          setOrder(merged);
        } else {
          // Default alphabetical
          setOrder([...folderNames].sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
          ));
        }
      } catch {
        // Fallback to alphabetical on any error
        setOrder([...folderNames].sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        ));
      }
    }
  }, [open, parentPath, getFolderOrder, folderNames.join(",")]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
  };

  const handleSave = () => {
    try {
      // Only save valid string arrays
      const validOrder = order.filter((item) => typeof item === "string");
      setFolderOrder(parentPath, validOrder);
    } catch {
      // Ignore save errors
    }
    onOpenChange(false);
  };

  const handleReset = () => {
    try {
      clearFolderOrder(parentPath);
    } catch {
      // Ignore clear errors
    }
    setOrder([...folderNames].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    ));
  };

  const displayPath = parentPath || "Racine";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Réorganiser les dossiers</DialogTitle>
          <DialogDescription>
            Ordre personnalisé pour <span className="font-mono text-primary">{displayPath}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {order.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun dossier à réorganiser
            </p>
          ) : (
            order.map((folderName, index) => (
              <div
                key={folderName}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm font-medium truncate">{folderName}</span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === order.length - 1}
                    onClick={() => moveDown(index)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Alphabétique
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Appliquer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
