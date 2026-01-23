"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus } from "lucide-react";
import { FormDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";
import { useVaultStore } from "@/lib/store";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { FolderTreePicker } from "./folder-tree-picker";

interface CreateFolderDialogProps {
  trigger?: React.ReactNode;
  defaultParent?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ROOT_VALUE = "__root__";

export function CreateFolderDialog({
  trigger,
  defaultParent,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateFolderDialogProps) {
  const { tree } = useVaultStore();
  const { setError } = useDialogAction();

  const [folderName, setFolderName] = useState("");
  const [selectedParent, setSelectedParent] = useState(defaultParent || ROOT_VALUE);

  // Sync selectedParent when dialog opens in controlled mode
  useEffect(() => {
    if (controlledOpen) {
      setFolderName("");
      setSelectedParent(defaultParent || ROOT_VALUE);
    }
  }, [controlledOpen, defaultParent]);

  const actualParent = selectedParent === ROOT_VALUE ? "" : selectedParent;

  const validate = useCallback((): string | null => {
    const trimmedName = folderName.trim();
    if (!trimmedName) return "Le nom du dossier est requis";
    if (/[<>:"/\\|?*]/.test(trimmedName)) return "Caractères invalides dans le nom";
    return null;
  }, [folderName]);

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      setError(error);
      throw new Error(error);
    }

    const folderPath = actualParent
      ? `${actualParent}/${folderName.trim()}`
      : folderName.trim();

    await githubClient.createFolder(folderPath);
  };

  const handleOpen = () => {
    setFolderName("");
    setSelectedParent(defaultParent || ROOT_VALUE);
  };

  return (
    <FormDialog
      trigger={
        trigger || (
          <Button variant="outline" size="sm">
            <FolderPlus className="h-4 w-4 mr-2" />
            Nouveau dossier
          </Button>
        )
      }
      title="Créer un nouveau dossier"
      description="Choisissez un emplacement et un nom pour le dossier"
      submitLabel="Créer"
      submitLoadingLabel="Création..."
      submitIcon={<FolderPlus className="h-4 w-4" />}
      onSubmit={handleSubmit}
      open={controlledOpen}
      onOpenChange={controlledOnOpenChange}
      onOpen={handleOpen}
    >
      <div className="space-y-2">
        <Label htmlFor="folderName">Nom du dossier</Label>
        <Input
          id="folderName"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyDown={(e) => {
            // Prevent arrow keys from being captured by dialog
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.stopPropagation();
            }
          }}
          autoFocus
          placeholder="Mon nouveau dossier"
        />
      </div>

      <div className="space-y-2">
        <Label>Dossier parent</Label>
        <FolderTreePicker
          tree={tree}
          selectedPath={selectedParent}
          onSelect={setSelectedParent}
        />
      </div>

      {folderName.trim() && (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          Chemin: <code>{actualParent ? `${actualParent}/` : ""}{folderName.trim()}/</code>
        </div>
      )}
    </FormDialog>
  );
}
