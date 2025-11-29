"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, AlertCircle, Check } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { FolderTreePicker } from "./folder-tree-picker";

const ROOT_VALUE = "__root__";

interface ImportNoteDialogProps {
  trigger?: React.ReactNode;
}

export function ImportNoteDialog({ trigger }: ImportNoteDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tree, triggerTreeRefresh } = useVaultStore();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [targetFolder, setTargetFolder] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".md")) {
        setError("Seuls les fichiers .md sont acceptés");
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name.replace(/\.md$/, ""));
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith(".md")) {
        setError("Seuls les fichiers .md sont acceptés");
        return;
      }
      setFile(droppedFile);
      setFileName(droppedFile.name.replace(/\.md$/, ""));
      setError(null);
    }
  }, []);

  const handleImport = async () => {
    if (!file || !fileName.trim()) return;

    setIsImporting(true);
    setError(null);

    try {
      const content = await file.text();
      const path = targetFolder
        ? `${targetFolder}/${fileName}.md`
        : `${fileName}.md`;

      const response = await fetch("/api/github/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'import");
      }

      setSuccess(true);
      triggerTreeRefresh();

      // Navigate to the new note after a short delay
      setTimeout(() => {
        setOpen(false);
        const notePath = path.replace(/\.md$/, "");
        router.push(`/note/${encodeURIComponent(notePath)}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setFile(null);
      setFileName("");
      setTargetFolder("");
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer un fichier Markdown</DialogTitle>
          <DialogDescription>
            Importez un fichier .md depuis votre appareil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${file
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <FileText className="h-8 w-8" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Glissez un fichier .md ici ou cliquez pour sélectionner
                </p>
              </div>
            )}
          </div>

          {/* File name */}
          {file && (
            <div className="space-y-2">
              <Label htmlFor="fileName">Nom de la note</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Nom de la note"
              />
            </div>
          )}

          {/* Target folder */}
          {file && tree.length > 0 && (
            <div className="space-y-2">
              <Label>Dossier de destination</Label>
              <FolderTreePicker
                tree={tree}
                selectedPath={targetFolder || ROOT_VALUE}
                onSelect={(path) => setTargetFolder(path === ROOT_VALUE ? "" : path)}
                showRoot={true}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <Check className="h-4 w-4" />
              Note importée avec succès !
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isImporting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !fileName.trim() || isImporting || success}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Import en cours...
              </>
            ) : success ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Importé !
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
