"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareLinkResult } from "./share-link-result";
import { EXPIRATION_OPTIONS, type ExpirationValue } from "@/types/shares";
import { Loader2 } from "lucide-react";

interface ShareFolderDialogProps {
  folderPath: string;
  folderName: string;
  trigger?: React.ReactNode;
}

export function ShareFolderDialog({
  folderPath,
  folderName,
  trigger,
}: ShareFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(folderName);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [expiresIn, setExpiresIn] = useState<ExpirationValue>("1w");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath,
          name: name !== folderName ? name : undefined,
          includeSubfolders,
          expiresIn,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création du partage");
      }

      const data = await response.json();
      setShareToken(data.share.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setTimeout(() => {
        setShareToken(null);
        setName(folderName);
        setIncludeSubfolders(true);
        setExpiresIn("1w");
        setError(null);
      }, 200);
    }
  };

  // If we have a token, show the result dialog
  if (shareToken) {
    return (
      <ShareLinkResult
        token={shareToken}
        folderName={folderName}
        open={open}
        onOpenChange={handleOpenChange}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager ce dossier</DialogTitle>
          <DialogDescription>
            Créez un lien de partage pour{" "}
            <span className="font-medium text-foreground">{folderName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="share-name">Nom du lien</Label>
            <Input
              id="share-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={folderName}
            />
            <p className="text-sm text-muted-foreground">
              Nom affiché dans la liste de vos liens partagés
            </p>
          </div>

          {/* Subfolder toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-subfolders">Inclure les sous-dossiers</Label>
              <p className="text-sm text-muted-foreground">
                {includeSubfolders
                  ? "Accès à tous les fichiers et sous-dossiers"
                  : "Accès uniquement aux fichiers de ce dossier"}
              </p>
            </div>
            <Switch
              id="include-subfolders"
              checked={includeSubfolders}
              onCheckedChange={setIncludeSubfolders}
            />
          </div>

          {/* Expiration select */}
          <div className="space-y-2">
            <Label htmlFor="expires-in">Expiration</Label>
            <Select value={expiresIn} onValueChange={(v) => setExpiresIn(v as ExpirationValue)}>
              <SelectTrigger id="expires-in">
                <SelectValue placeholder="Choisir une durée" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Le lien cessera de fonctionner après cette période
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Création..." : "Créer le lien"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
