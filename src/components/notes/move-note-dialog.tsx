"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FolderInput } from "lucide-react";
import { FormDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";
import { useVaultStore } from "@/lib/store";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { FolderTreePicker } from "./folder-tree-picker";

interface MoveNoteDialogProps {
  path: string;
  sha: string;
  noteName: string;
  trigger?: React.ReactNode;
}

const ROOT_VALUE = "__root__";

function getParentFolder(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function getFileName(path: string): string {
  return path.split("/").pop() || "";
}

export function MoveNoteDialog({ path, sha, noteName, trigger }: MoveNoteDialogProps) {
  const { tree } = useVaultStore();
  const { setError } = useDialogAction();

  const currentFolder = getParentFolder(path);
  const currentFolderValue = currentFolder || ROOT_VALUE;
  const fileName = getFileName(path);
  const [selectedFolder, setSelectedFolder] = useState(currentFolderValue);

  const actualSelectedFolder = selectedFolder === ROOT_VALUE ? "" : selectedFolder;

  const validate = useCallback((): string | null => {
    if (actualSelectedFolder === currentFolder) {
      return "Sélectionnez un dossier différent";
    }
    return null;
  }, [actualSelectedFolder, currentFolder]);

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      setError(error);
      throw new Error(error);
    }

    const newPath = actualSelectedFolder ? `${actualSelectedFolder}/${fileName}` : fileName;
    await githubClient.moveNote(path, newPath, sha);
  };

  const getNavigateTo = () => {
    const newPath = actualSelectedFolder ? `${actualSelectedFolder}/${fileName}` : fileName;
    const notePath = newPath.replace(".md", "");
    return `/note/${notePath.split("/").map(encodeURIComponent).join("/")}`;
  };

  return (
    <FormDialog
      trigger={
        trigger || (
          <Button variant="ghost" size="sm">
            <FolderInput className="h-4 w-4" />
          </Button>
        )
      }
      title={
        <span className="flex items-center gap-2">
          <FolderInput className="h-5 w-5" />
          Déplacer la note
        </span>
      }
      description={<>Déplacer <strong>{noteName}</strong> vers un autre dossier</>}
      submitLabel="Déplacer"
      submitLoadingLabel="Déplacement..."
      submitIcon={<FolderInput className="h-4 w-4" />}
      onSubmit={handleSubmit}
      navigateTo={validate() ? undefined : getNavigateTo()}
      onOpen={() => setSelectedFolder(currentFolderValue)}
    >
      <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
        Emplacement actuel: <code>{path}</code>
      </div>

      <div className="space-y-2">
        <Label>Nouveau dossier</Label>
        <FolderTreePicker
          tree={tree}
          selectedPath={selectedFolder}
          onSelect={setSelectedFolder}
          currentPath={path}
        />
      </div>

      {actualSelectedFolder !== currentFolder && (
        <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-2 rounded-md">
          Nouveau chemin:{" "}
          <code>
            {actualSelectedFolder ? `${actualSelectedFolder}/` : ""}
            {fileName}
          </code>
        </div>
      )}
    </FormDialog>
  );
}
