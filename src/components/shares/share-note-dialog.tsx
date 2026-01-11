"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ShareNoteDialogProps {
  notePath: string; // path without .md extension
  noteName: string;
  trigger?: React.ReactNode;
}

export function ShareNoteDialog({
  notePath,
  noteName,
  trigger,
}: ShareNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(noteName);
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
          shareType: "note",
          folderPath: notePath,
          name: name !== noteName ? name : undefined,
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
      setTimeout(() => {
        setShareToken(null);
        setName(noteName);
        setExpiresIn("1w");
        setError(null);
      }, 200);
    }
  };

  if (shareToken) {
    return (
      <ShareLinkResult
        token={shareToken}
        folderName={noteName}
        isNote={true}
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
          <DialogTitle>Partager cette note</DialogTitle>
          <DialogDescription>
            Créez un lien de partage pour{" "}
            <span className="font-medium text-foreground">{noteName}</span>
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
              placeholder={noteName}
            />
            <p className="text-sm text-muted-foreground">
              Nom affiché dans la liste de vos liens partagés
            </p>
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
