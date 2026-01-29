"use client";

import { useState } from "react";
import { Share2, Eye, Pencil, Upload } from "lucide-react";
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
import { DepositConfigSection } from "./deposit-config-section";
import { EXPIRATION_OPTIONS, DEFAULT_DEPOSIT_CONFIG, type ExpirationValue, type ShareMode, type DepositConfig } from "@/types/shares";
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
  const [mode, setMode] = useState<ShareMode>("reader");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deposit configuration
  const [depositMaxFileSize, setDepositMaxFileSize] = useState(DEFAULT_DEPOSIT_CONFIG.maxFileSize);
  const [depositAllowedTypes, setDepositAllowedTypes] = useState<string[] | null>(DEFAULT_DEPOSIT_CONFIG.allowedTypes);
  const [depositFolder, setDepositFolder] = useState<string | null>(DEFAULT_DEPOSIT_CONFIG.depositFolder);

  // Permission flags (for reader/writer modes)
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowExport, setAllowExport] = useState(true);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build deposit config if in deposit mode
      const depositConfig: DepositConfig | undefined = mode === "deposit"
        ? {
            maxFileSize: depositMaxFileSize,
            allowedTypes: depositAllowedTypes,
            depositFolder: depositFolder,
          }
        : undefined;

      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath,
          name: name !== folderName ? name : undefined,
          includeSubfolders,
          expiresIn,
          mode,
          depositConfig,
          // Permission flags (only relevant for reader/writer modes)
          allowCopy: mode !== "deposit" ? allowCopy : undefined,
          allowExport: mode !== "deposit" ? allowExport : undefined,
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
        setMode("reader");
        setError(null);
        // Reset deposit config
        setDepositMaxFileSize(DEFAULT_DEPOSIT_CONFIG.maxFileSize);
        setDepositAllowedTypes(DEFAULT_DEPOSIT_CONFIG.allowedTypes);
        setDepositFolder(DEFAULT_DEPOSIT_CONFIG.depositFolder);
        // Reset permission flags
        setAllowCopy(true);
        setAllowExport(true);
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
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Partager ce dossier</DialogTitle>
          <DialogDescription>
            Créez un lien de partage pour{" "}
            <span className="font-medium text-foreground">{folderName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4 overflow-y-auto flex-1 pr-2">
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

          {/* Mode select */}
          <div className="space-y-2">
            <Label htmlFor="mode">Mode d&apos;accès</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ShareMode)}>
              <SelectTrigger id="mode">
                <SelectValue placeholder="Choisir un mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reader">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Lecture seule
                  </span>
                </SelectItem>
                <SelectItem value="writer">
                  <span className="flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Lecture + écriture
                  </span>
                </SelectItem>
                <SelectItem value="deposit">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Dépôt uniquement
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {mode === "writer"
                ? "Les visiteurs pourront modifier les notes"
                : mode === "deposit"
                ? "Les visiteurs pourront déposer des fichiers sans voir le contenu"
                : "Les visiteurs pourront uniquement lire"}
            </p>
          </div>

          {/* Deposit configuration (only shown in deposit mode) */}
          {mode === "deposit" && (
            <DepositConfigSection
              maxFileSize={depositMaxFileSize}
              setMaxFileSize={setDepositMaxFileSize}
              allowedTypes={depositAllowedTypes}
              setAllowedTypes={setDepositAllowedTypes}
              depositFolder={depositFolder}
              setDepositFolder={setDepositFolder}
            />
          )}

          {/* Permission toggles (only shown for reader/writer modes) */}
          {mode !== "deposit" && (
            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Permissions pour les visiteurs
              </p>

              {/* Allow copy to vault */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-copy">Copier vers vault</Label>
                  <p className="text-sm text-muted-foreground">
                    {allowCopy
                      ? "Les visiteurs connectés peuvent copier dans leur vault"
                      : "Copie vers vault désactivée"}
                  </p>
                </div>
                <Switch
                  id="allow-copy"
                  checked={allowCopy}
                  onCheckedChange={setAllowCopy}
                />
              </div>

              {/* Allow export */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-export">Export PDF/MD</Label>
                  <p className="text-sm text-muted-foreground">
                    {allowExport
                      ? "Les visiteurs peuvent exporter en PDF ou Markdown"
                      : "Export désactivé"}
                  </p>
                </div>
                <Switch
                  id="allow-export"
                  checked={allowExport}
                  onCheckedChange={setAllowExport}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}
        </div>

        {/* Actions - fixed at bottom */}
        <div className="flex justify-end gap-2 pt-4 shrink-0 border-t border-border mt-4">
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
      </DialogContent>
    </Dialog>
  );
}
