"use client";

import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";

interface DeleteNoteDialogProps {
  path: string;
  sha: string;
  noteName: string;
  trigger?: React.ReactNode;
}

export function DeleteNoteDialog({ path, sha, noteName, trigger }: DeleteNoteDialogProps) {
  return (
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
        </>
      }
      confirmLabel="Supprimer"
      confirmLoadingLabel="Suppression..."
      confirmIcon={<Trash2 className="h-4 w-4" />}
      variant="destructive"
      onConfirm={() => githubClient.deleteNote(path, sha)}
      navigateTo="/"
    />
  );
}
