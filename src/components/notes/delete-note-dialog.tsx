"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs";
import { PinDialog } from "@/components/lock/pin-dialog";
import { githubClient } from "@/services/github-client";
import { useLockStore, isPathLocked } from "@/lib/lock-store";

interface DeleteNoteDialogProps {
  path: string;
  sha: string;
  noteName: string;
  isLocked?: boolean; // Frontmatter lock (private: true, #lock)
  trigger?: React.ReactNode;
}

export function DeleteNoteDialog({ path, sha, noteName, isLocked = false, trigger }: DeleteNoteDialogProps) {
  const { hasPinConfigured, isUnlocked } = useLockStore();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  // Check if note is in a _private folder
  const isInPrivateFolder = isPathLocked(path);
  const isLockedOrPrivate = isLocked || isInPrivateFolder;

  // PIN verification logic:
  // - For normal files → NEVER ask PIN (regardless of settings)
  // - For locked/_private files → ask PIN only if not already unlocked
  const needsPinVerification = hasPinConfigured && isLockedOrPrivate && !isUnlocked;

  const handleDelete = async () => {
    if (needsPinVerification) {
      // Show PIN dialog first
      setPendingDelete(true);
      setShowPinDialog(true);
      return Promise.resolve(); // Don't actually delete yet
    }
    // No PIN needed, proceed with delete
    return githubClient.deleteNote(path, sha);
  };

  const handlePinSuccess = async () => {
    setShowPinDialog(false);
    if (pendingDelete) {
      setPendingDelete(false);
      // Now actually delete
      await githubClient.deleteNote(path, sha);
      // Navigate to home after delete
      window.location.href = "/";
    }
  };

  return (
    <>
      <ConfirmDialog
        trigger={
          trigger || (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )
        }
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Supprimer la note
          </span>
        }
        description={
          <>
            Êtes-vous sûr de vouloir supprimer <strong>{noteName}</strong> ?
            <br />
            Cette action est irréversible.
            {needsPinVerification && (
              <span className="block mt-2 text-amber-500 text-sm">
                🔐 Le code PIN sera requis pour confirmer
              </span>
            )}
          </>
        }
        confirmLabel="Supprimer"
        confirmLoadingLabel="Suppression..."
        confirmIcon={<Trash2 className="h-4 w-4" />}
        variant="destructive"
        onConfirm={handleDelete}
        navigateTo={needsPinVerification ? undefined : "/"}
      />

      {/* PIN verification dialog */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={(open) => {
          setShowPinDialog(open);
          if (!open) setPendingDelete(false);
        }}
        onSuccess={handlePinSuccess}
        mode="verify"
        contextMessage={
          isLockedOrPrivate
            ? "Suppression d'un fichier protégé (verrouillé ou dans _private)"
            : "Confirmation requise pour la suppression"
        }
      />
    </>
  );
}
