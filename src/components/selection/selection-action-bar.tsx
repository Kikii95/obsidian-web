"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, FolderInput, X, Loader2, Download } from "lucide-react";
import { useSelectionStore } from "@/lib/selection-store";
import { useVaultStore } from "@/lib/store";
import { BatchDeleteDialog } from "./batch-delete-dialog";

export function SelectionActionBar() {
  const { isSelectionMode, selectedCount, exitSelectionMode, getSelectedItems } = useSelectionStore();
  const { triggerTreeRefresh } = useVaultStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const count = selectedCount();

  if (!isSelectionMode || count === 0) {
    return null;
  }

  const selectedItems = getSelectedItems();
  const fileCount = selectedItems.filter((i) => i.type === "file").length;
  const folderCount = selectedItems.filter((i) => i.type === "dir").length;

  // Build description text
  const parts: string[] = [];
  if (fileCount > 0) parts.push(`${fileCount} fichier${fileCount > 1 ? "s" : ""}`);
  if (folderCount > 0) parts.push(`${folderCount} dossier${folderCount > 1 ? "s" : ""}`);
  const description = parts.join(" et ");

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl shadow-lg">
          {/* Selection count */}
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {description}
          </span>

          <div className="w-px h-6 bg-border" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {/* Move - TODO */}
            <Button
              variant="ghost"
              size="sm"
              title="Déplacer (bientôt)"
              disabled
            >
              <FolderInput className="h-4 w-4" />
            </Button>

            {/* Export - TODO */}
            <Button
              variant="ghost"
              size="sm"
              title="Exporter (bientôt)"
              disabled
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Cancel */}
          <Button
            variant="ghost"
            size="sm"
            onClick={exitSelectionMode}
            title="Annuler"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Batch delete dialog */}
      <BatchDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        items={selectedItems}
        onSuccess={() => {
          triggerTreeRefresh();
          exitSelectionMode();
        }}
      />
    </>
  );
}
