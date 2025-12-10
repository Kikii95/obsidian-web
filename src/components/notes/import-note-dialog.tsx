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
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, AlertCircle, Check, AlertTriangle, Image, Film, FileJson, FileIcon, X, CheckCircle, XCircle, Folder } from "lucide-react";
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

interface FileWithPath {
  file: File;
  relativePath: string; // For folder uploads, keeps the relative path
  displayName: string;
}

interface ImportResult {
  path: string;
  success: boolean;
  error?: string;
}

interface ImportNoteDialogProps {
  trigger?: React.ReactNode;
  defaultTargetFolder?: string; // Pre-select target folder
}

export function ImportNoteDialog({ trigger, defaultTargetFolder }: ImportNoteDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { tree, triggerTreeRefresh } = useVaultStore();

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [targetFolder, setTargetFolder] = useState(defaultTargetFolder || "");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showLfsWarning, setShowLfsWarning] = useState(false);

  const validateAndAddFiles = useCallback((fileList: FileList, isFromFolder = false) => {
    const newFiles: FileWithPath[] = [];
    let hasLargeFile = false;
    let skippedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();

      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        skippedCount++;
        continue; // Skip unsupported files silently
      }

      // For folder uploads, webkitRelativePath contains the full relative path including filename
      // e.g., "MyFolder/subfolder/file.md"
      const webkitPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";

      let relativePath = "";
      if (isFromFolder && webkitPath) {
        // Remove the filename to get the folder path
        const parts = webkitPath.split("/");
        parts.pop(); // Remove filename
        relativePath = parts.join("/");
      }

      if (file.size > LFS_WARNING_SIZE) {
        hasLargeFile = true;
      }

      newFiles.push({
        file,
        relativePath,
        displayName: file.name,
      });
    }

    if (newFiles.length === 0) {
      if (skippedCount > 0) {
        setError(`Aucun fichier supporté trouvé (${skippedCount} fichier${skippedCount > 1 ? "s" : ""} ignoré${skippedCount > 1 ? "s" : ""})`);
      } else {
        setError("Aucun fichier trouvé dans le dossier");
      }
      return;
    }

    setShowLfsWarning(hasLargeFile);
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      validateAndAddFiles(fileList, false);
    }
    // Reset input
    e.target.value = "";
  }, [validateAndAddFiles]);

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      validateAndAddFiles(fileList, true); // Mark as folder upload
    }
    // Reset input
    e.target.value = "";
  }, [validateAndAddFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const fileList = e.dataTransfer.files;
    if (fileList && fileList.length > 0) {
      // Check if any file has webkitRelativePath (folder drop)
      const isFromFolder = Array.from(fileList).some(
        (f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath
      );
      validateAndAddFiles(fileList, isFromFolder);
    }
  }, [validateAndAddFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleImport = async () => {
    if (files.length === 0) return;

    setIsImporting(true);
    setError(null);
    setProgress(0);
    setResults([]);

    const importResults: ImportResult[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const { file, relativePath } = files[i];

      // Build full path
      let fullPath = file.name;
      if (relativePath) {
        fullPath = `${relativePath}/${file.name}`;
      }
      if (targetFolder) {
        fullPath = `${targetFolder}/${fullPath}`;
      }

      try {
        const category = getFileCategory(file.name);

        // For text-based files (md, canvas), read as text
        // For binary files (images, videos, pdf), read as base64
        if (category === "markdown" || category === "canvas") {
          const content = await file.text();
          await githubClient.createNote(fullPath, content);
        } else {
          // Binary file - read as ArrayBuffer and convert to base64
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );
          await githubClient.createBinaryFile(fullPath, base64);
        }

        importResults.push({ path: fullPath, success: true });
      } catch (err) {
        importResults.push({
          path: fullPath,
          success: false,
          error: err instanceof Error ? err.message : "Erreur",
        });
      }

      setProgress(((i + 1) / total) * 100);
      setResults([...importResults]);
    }

    setIsImporting(false);
    triggerTreeRefresh();

    // If single file and success, navigate to it
    const successCount = importResults.filter((r) => r.success).length;
    if (files.length === 1 && successCount === 1) {
      const file = files[0];
      const category = getFileCategory(file.file.name);
      let fullPath = file.file.name;
      if (file.relativePath) fullPath = `${file.relativePath}/${file.file.name}`;
      if (targetFolder) fullPath = `${targetFolder}/${fullPath}`;

      setTimeout(() => {
        setOpen(false);
        if (category === "markdown") {
          const notePath = fullPath.replace(/\.md$/, "");
          router.push(`/note/${encodeURIComponent(notePath)}`);
        } else if (category === "canvas") {
          const canvasPath = fullPath.replace(/\.canvas$/, "");
          router.push(`/canvas/${encodeURIComponent(canvasPath)}`);
        } else {
          router.push(`/file/${encodeURIComponent(fullPath)}`);
        }
      }, 1000);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setFiles([]);
      setTargetFolder(defaultTargetFolder || "");
      setError(null);
      setProgress(0);
      setResults([]);
      setShowLfsWarning(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const isDone = results.length === files.length && results.length > 0 && !isImporting;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Importer des fichiers</DialogTitle>
          <DialogDescription>
            Importez des fichiers dans votre vault (notes, images, vidéos, PDF, canvas)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Drop zone */}
          {files.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200 border-muted-foreground/25
                hover:border-primary/50 hover:bg-muted/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_STRING}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Glissez des fichiers ici ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground/70">
                  .md, .canvas, .pdf, images, vidéos
                </p>
              </div>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && !isDone && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{files.length} fichier{files.length > 1 ? "s" : ""} ({(totalSize / 1024 / 1024).toFixed(2)} MB)</Label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_STRING}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <Folder className="h-3 w-3 mr-1" />
                    Dossier
                  </Button>
                  <input
                    ref={folderInputRef}
                    type="file"
                    onChange={handleFolderSelect}
                    className="hidden"
                    /* @ts-expect-error webkitdirectory is non-standard */
                    webkitdirectory=""
                    multiple
                  />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md divide-y divide-border">
                {files.map((f, index) => {
                  const IconComponent = getFileIcon(getFileCategory(f.file.name));
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 text-sm">
                      <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{f.displayName}</p>
                        {f.relativePath && (
                          <p className="text-xs text-muted-foreground truncate">{f.relativePath}/</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(f.file.size / 1024).toFixed(0)} KB
                      </span>
                      {!isImporting && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LFS Warning */}
          {showLfsWarning && !isDone && (
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

          {/* Target folder */}
          {files.length > 0 && tree.length > 0 && !isDone && (
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

          {/* Progress */}
          {(isImporting || isDone) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {isImporting ? `Import en cours... ${Math.round(progress)}%` : `${successCount} importé${successCount > 1 ? "s" : ""}${failCount > 0 ? `, ${failCount} erreur${failCount > 1 ? "s" : ""}` : ""}`}
              </p>
            </div>
          )}

          {/* Results */}
          {isDone && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-xs p-2 rounded ${
                    result.success ? "bg-green-500/10" : "bg-destructive/10"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <span className="truncate flex-1">{result.path}</span>
                  {!result.success && result.error && (
                    <span className="text-destructive shrink-0">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {isDone ? (
            <Button onClick={() => handleOpenChange(false)}>
              Fermer
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isImporting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={files.length === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Import...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importer {files.length > 1 ? `(${files.length})` : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
