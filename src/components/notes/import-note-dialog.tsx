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
import { Upload, FileText, Loader2, AlertCircle, Check, AlertTriangle, Image, Film, FileJson, FileIcon } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { githubClient } from "@/services/github-client";
import { FolderTreePicker } from "./folder-tree-picker";

const ROOT_VALUE = "__root__";

// Supported file types
const ACCEPTED_EXTENSIONS = [
  ".md",      // Markdown
  ".canvas",  // Obsidian Canvas
  ".pdf",     // PDF
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", // Images
  ".mp4", ".webm", ".mov", ".avi",  // Videos
];

const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

// Size threshold for LFS warning (50MB)
const LFS_WARNING_SIZE = 50 * 1024 * 1024;

// Get file type category
function getFileCategory(filename: string): "markdown" | "canvas" | "image" | "video" | "pdf" | "other" {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "md") return "markdown";
  if (ext === "canvas") return "canvas";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) return "image";
  if (["mp4", "webm", "mov", "avi"].includes(ext || "")) return "video";
  return "other";
}

// Get icon for file type
function getFileIcon(category: ReturnType<typeof getFileCategory>) {
  switch (category) {
    case "markdown": return FileText;
    case "canvas": return FileJson;
    case "image": return Image;
    case "video": return Film;
    case "pdf": return FileIcon;
    default: return FileText;
  }
}

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
  const [fileExtension, setFileExtension] = useState("");
  const [targetFolder, setTargetFolder] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showLfsWarning, setShowLfsWarning] = useState(false);

  const validateAndSetFile = useCallback((selectedFile: File) => {
    const ext = "." + selectedFile.name.split(".").pop()?.toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Format non supporté. Formats acceptés : ${ACCEPTED_EXTENSIONS.join(", ")}`);
      return;
    }

    // Check file size for LFS warning
    if (selectedFile.size > LFS_WARNING_SIZE) {
      setShowLfsWarning(true);
    } else {
      setShowLfsWarning(false);
    }

    setFile(selectedFile);
    // Remove extension from filename for display
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setFileName(nameWithoutExt);
    setFileExtension(ext);
    setError(null);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, [validateAndSetFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, [validateAndSetFile]);

  const handleImport = async () => {
    if (!file || !fileName.trim()) return;

    setIsImporting(true);
    setError(null);

    try {
      const fullFileName = `${fileName}${fileExtension}`;
      const path = targetFolder
        ? `${targetFolder}/${fullFileName}`
        : fullFileName;

      const category = getFileCategory(file.name);

      // For text-based files (md, canvas), read as text
      // For binary files (images, videos, pdf), read as base64
      if (category === "markdown" || category === "canvas") {
        const content = await file.text();
        await githubClient.createNote(path, content);
      } else {
        // Binary file - read as ArrayBuffer and convert to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        await githubClient.createBinaryFile(path, base64);
      }

      setSuccess(true);
      triggerTreeRefresh();

      // Navigate based on file type after a short delay
      setTimeout(() => {
        setOpen(false);
        if (category === "markdown") {
          const notePath = path.replace(/\.md$/, "");
          router.push(`/note/${encodeURIComponent(notePath)}`);
        } else if (category === "canvas") {
          const canvasPath = path.replace(/\.canvas$/, "");
          router.push(`/canvas/${encodeURIComponent(canvasPath)}`);
        } else {
          router.push(`/file/${encodeURIComponent(path)}`);
        }
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
      setFileExtension("");
      setTargetFolder("");
      setError(null);
      setSuccess(false);
      setShowLfsWarning(false);
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
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Importer un fichier</DialogTitle>
          <DialogDescription>
            Importez des fichiers dans votre vault (notes, images, vidéos, PDF, canvas)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
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
              accept={ACCEPT_STRING}
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                {(() => {
                  const IconComponent = getFileIcon(getFileCategory(file.name));
                  return <IconComponent className="h-8 w-8" />;
                })()}
                <div className="text-left">
                  <span className="font-medium block">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Glissez un fichier ici ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground/70">
                  .md, .canvas, .pdf, images, vidéos
                </p>
              </div>
            )}
          </div>

          {/* LFS Warning */}
          {showLfsWarning && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Fichier volumineux détecté</p>
                <p className="text-xs mt-1 opacity-80">
                  GitHub limite les fichiers à 100MB. Pour les gros fichiers, configurez{" "}
                  <a
                    href="https://github.com/Kikii95/obsidian-web#what-about-large-files-videos-pdfs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Git LFS
                  </a>
                  {" "}sur votre repo.
                </p>
              </div>
            </div>
          )}

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

        <DialogFooter className="flex-shrink-0">
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
