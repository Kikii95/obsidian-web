"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Folder } from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs";
import { PinDialog } from "@/components/lock/pin-dialog";
import { githubClient } from "@/services/github-client";
import { useLockStore, isPathLocked } from "@/lib/lock-store";
import { useSettingsStore } from "@/lib/settings-store";
import { useVaultStore } from "@/lib/store";

interface DeleteFolderDialogProps {
  path: string;
  folderName: string;
  itemCount?: number;
  trigger?: React.ReactNode;
}

export function DeleteFolderDialog({ path, folderName, itemCount = 0, trigger }: DeleteFolderDialogProps) {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { hasPinConfigured, isUnlocked } = useLockStore();
  const { triggerTreeRefresh } = useVaultStore();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  // Check if folder is _private
  const isInPrivateFolder = isPathLocked(path);
  const isPrivateFolder = folderName.toLowerCase() === "_private" || folderName.toLowerCase().startsWith("_private.");

  // PIN verification logic
  const needsPinVerification = hasPinConfigured && (isPrivateFolder || isInPrivateFolder) && (
    settings.requirePinOnDelete || !isUnlocked
  );

  const handleDelete = async () => {
    if (needsPinVerification) {
      setPendingDelete(true);
      setShowPinDialog(true);
      return Promise.resolve();
    }
    // Proceed with delete
    await githubClient.deleteFolder(path);
    triggerTreeRefresh();
  };

  const handlePinSuccess = async () => {
    setShowPinDialog(false);
    if (pendingDelete) {
      setPendingDelete(false);
      await githubClient.deleteFolder(path);
      triggerTreeRefresh();
      // Navigate to parent folder
      const parentPath = path.includes("/")
        ? path.substring(0, path.lastIndexOf("/"))
        : "";
      router.push(parentPath ? `/folder/${parentPath.split("/").map(encodeURIComponent).join("/")}` : "/folder");
    }
  };

  // Calculate parent path for navigation after delete
  const parentPath = path.includes("/")
    ? path.substring(0, path.lastIndexOf("/"))
    : "";
  const navigateTo = parentPath
    ? `/folder/${parentPath.split("/").map(encodeURIComponent).join("/")}`
    : "/folder";

  return (
    <>
      <ConfirmDialog
        trigger={
          trigger || (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          )
        }
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Supprimer le dossier
          </span>
        }
        description={
          <>
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted rounded-md">
              <Folder className="h-5 w-5 text-primary" />
              <span className="font-medium">{folderName}</span>
            </div>
            Êtes-vous sûr de vouloir supprimer ce dossier
            {itemCount > 0 && (
              <span className="text-destructive font-medium">
                {" "}et ses {itemCount} élément{itemCount > 1 ? "s" : ""}
              </span>
            )}
            ?
            <br />
            <span className="text-destructive text-sm">Cette action est irréversible.</span>
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
        navigateTo={needsPinVerification ? undefined : navigateTo}
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
        contextMessage="Suppression d'un dossier protégé"
      />
    </>
  );
}
