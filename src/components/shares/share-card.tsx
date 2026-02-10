"use client";

import { useState } from "react";
import {
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Folder,
  FileText,
  Clock,
  Eye,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ShareCardProps } from "@/types/shares";

export function ShareCard({ share, handlers, state, utils }: ShareCardProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(share.name);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRenameSubmit = async () => {
    if (renameValue.trim() === share.name) {
      setRenameOpen(false);
      return;
    }
    setIsRenaming(true);
    const success = await handlers.onRename(share.token, renameValue.trim());
    setIsRenaming(false);
    if (success) {
      setRenameOpen(false);
    }
  };

  const isNote = share.shareType === "note";
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${share.token}`
      : `/s/${share.token}`;

  return (
    <Card className={cn(share.isExpired && "border-dashed")}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                isNote ? "bg-blue-500/10" : "bg-primary/10"
              )}
            >
              {isNote ? (
                <FileText className="h-5 w-5 text-blue-500" />
              ) : (
                <Folder className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">{share.name}</CardTitle>
              <CardDescription className="truncate max-w-[200px] sm:max-w-none">
                {share.folderPath}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end sm:shrink-0">
            {/* Rename dialog */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Renommer">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Renommer ce lien</DialogTitle>
                  <DialogDescription>
                    Changez le nom d'affichage de ce lien de partage
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="share-rename">Nouveau nom</Label>
                  <Input
                    id="share-rename"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder={share.folderName}
                    className="mt-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRenameSubmit();
                      }
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setRenameOpen(false)}
                    disabled={isRenaming}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleRenameSubmit} disabled={isRenaming}>
                    {isRenaming ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {isRenaming ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {!share.isExpired && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlers.onCopy(share.token)}
                  title="Copier le lien"
                >
                  {state.copiedToken === share.token ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="Ouvrir le lien"
                >
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  title="Supprimer"
                  disabled={state.deletingId === share.token}
                >
                  {state.deletingId === share.token ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce lien ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le lien vers "{share.name}" sera définitivement supprimé.
                    Les personnes ayant ce lien ne pourront plus accéder au
                    contenu.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handlers.onDelete(share.token)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Type badge */}
          <Badge variant="secondary">
            {isNote ? "Note" : "Dossier"}
            {!isNote && share.includeSubfolders && " + sous-dossiers"}
          </Badge>

          {/* Mode badge */}
          <Badge variant={share.mode === "writer" ? "default" : "outline"}>
            {share.mode === "writer" ? (
              <>
                <Pencil className="h-3 w-3 mr-1" />
                Écriture
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Lecture
              </>
            )}
          </Badge>

          {/* Expiration */}
          <div
            className={cn(
              "flex items-center gap-1",
              share.isExpired ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{utils.getTimeRemaining(share.expiresAt)}</span>
          </div>

          {/* Access count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <span>
              {share.accessCount} vue{share.accessCount > 1 ? "s" : ""}
            </span>
          </div>

          {/* Created date */}
          <div className="text-muted-foreground text-xs ml-auto">
            Créé le {utils.formatDate(share.createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
