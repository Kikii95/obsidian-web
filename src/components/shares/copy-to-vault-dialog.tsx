"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type ConflictStrategy = "skip" | "rename" | "overwrite";

interface CopyToVaultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  paths: string[];
  shareFolderPath: string;
  onSuccess?: () => void;
}

interface ImportResult {
  success: string[];
  skipped: string[];
  errors: string[];
}

export function CopyToVaultDialog({
  open,
  onOpenChange,
  token,
  paths,
  shareFolderPath,
  onSuccess,
}: CopyToVaultDialogProps) {
  const { data: session } = useSession();
  const [targetPath, setTargetPath] = useState("Imports");
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>("rename");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get display names for paths
  const displayPaths = paths.map((p) => {
    const relativePath = p.startsWith(shareFolderPath + "/")
      ? p.slice(shareFolderPath.length + 1)
      : p.split("/").pop() || p;
    return relativePath;
  });

  const handleCopy = async () => {
    if (!session) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // 1. Export from share
      const exportRes = await fetch(`/api/shares/${token}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });

      if (!exportRes.ok) {
        const data = await exportRes.json();
        throw new Error(data.error || "Erreur lors de l'export");
      }

      const { files } = await exportRes.json();

      if (!files || files.length === 0) {
        throw new Error("Aucun fichier à copier");
      }

      // 2. Import to vault
      const importRes = await fetch("/api/vault/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          targetPath,
          conflictStrategy,
        }),
      });

      if (!importRes.ok) {
        const data = await importRes.json();
        throw new Error(data.error || "Erreur lors de l'import");
      }

      const importResult: ImportResult = await importRes.json();
      setResult(importResult);

      if (importResult.success.length > 0) {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setResult(null);
      setError(null);
      onOpenChange(false);
    }
  };

  // Not logged in
  if (!session) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copier vers mon vault
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <p className="text-muted-foreground">
              Connectez-vous pour copier des fichiers vers votre vault.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copier vers mon vault
          </DialogTitle>
          <DialogDescription>
            Copiez les fichiers sélectionnés dans votre vault personnel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Files to copy */}
          <div>
            <Label className="text-sm font-medium">
              Fichiers à copier ({paths.length})
            </Label>
            <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
              {displayPaths.map((p, i) => (
                <div key={i} className="text-sm text-muted-foreground truncate py-0.5">
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* Target folder */}
          <div className="space-y-2">
            <Label htmlFor="target-path">Dossier de destination</Label>
            <Input
              id="target-path"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="ex: Imports, Documents/Shares"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Le dossier sera créé s'il n'existe pas.
            </p>
          </div>

          {/* Conflict strategy */}
          <div className="space-y-2">
            <Label>Si le fichier existe déjà</Label>
            <Select
              value={conflictStrategy}
              onValueChange={(v) => setConflictStrategy(v as ConflictStrategy)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rename">Renommer (ajouter _copy)</SelectItem>
                <SelectItem value="skip">Ignorer</SelectItem>
                <SelectItem value="overwrite">Écraser</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              {result.success.length > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm">
                    {result.success.length} fichier{result.success.length > 1 ? "s" : ""} copié
                    {result.success.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {result.skipped.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-sm">
                    {result.skipped.length} fichier{result.skipped.length > 1 ? "s" : ""} ignoré
                    {result.skipped.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">
                      {result.errors.length} erreur{result.errors.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="text-xs space-y-0.5 ml-6">
                    {result.errors.slice(0, 3).map((e, i) => (
                      <li key={i} className="truncate">{e}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li>...et {result.errors.length - 3} autres</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result ? "Fermer" : "Annuler"}
          </Button>
          {!result && (
            <Button onClick={handleCopy} disabled={loading || paths.length === 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Copier
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
