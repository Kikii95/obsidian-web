"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { Upload, FileText, Loader2, AlertCircle, Check, AlertTriangle, Image, Film, FileJson, FileIcon, X, CheckCircle, XCircle, Folder, Archive, ChevronRight, ChevronDown } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { githubClient } from "@/services/github-client";
import { FolderTreePicker } from "./folder-tree-picker";
import JSZip from "jszip";

const ROOT_VALUE = "__root__";

// Supported file types
const ACCEPTED_EXTENSIONS = [
  ".md",      // Markdown
  ".canvas",  // Obsidian Canvas
  ".pdf",     // PDF
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", // Images
  ".mp4", ".webm", ".mov", ".avi",  // Videos
  ".zip",     // ZIP archives
];

// Extensions inside ZIP that are supported
const SUPPORTED_INNER_EXTENSIONS = [
  ".md", ".canvas", ".pdf",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".mp4", ".webm", ".mov", ".avi",
];

const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

// Size threshold for LFS warning (50MB)
const LFS_WARNING_SIZE = 50 * 1024 * 1024;

// Get file type category
function getFileCategory(filename: string): "markdown" | "canvas" | "image" | "video" | "pdf" | "zip" | "other" {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "md") return "markdown";
  if (ext === "canvas") return "canvas";
  if (ext === "pdf") return "pdf";
  if (ext === "zip") return "zip";
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
    case "zip": return Archive;
    default: return FileText;
  }
}

interface ZipContent {
  path: string;
  name: string;
  size: number;
  isSupported: boolean;
}

interface FileWithPath {
  file: File;
  relativePath: string; // For folder uploads, keeps the relative path
  displayName: string;
  isZip?: boolean;
  zipContents?: ZipContent[]; // Preview of ZIP contents
  zipExpanded?: boolean; // UI state for collapsing
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
  const cancelledRef = useRef(false);

  const validateAndAddFiles = useCallback(async (fileList: FileList, isFromFolder = false) => {
    const newFiles: FileWithPath[] = [];
    let hasLargeFile = false;
    let skippedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Get extension properly
      const nameParts = file.name.split(".");
      const ext = nameParts.length > 1 ? "." + nameParts.pop()?.toLowerCase() : "";

      // Check if extension is supported
      const isSupported = ACCEPTED_EXTENSIONS.some(
        (accepted) => accepted.toLowerCase() === ext.toLowerCase()
      );

      if (!isSupported) {
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

      // Special handling for ZIP files - read contents for preview
      if (ext === ".zip") {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipContents: ZipContent[] = [];

          zip.forEach((path, zipEntry) => {
            if (!zipEntry.dir) {
              const entryExt = "." + path.split(".").pop()?.toLowerCase();
              const entryName = path.split("/").pop() || path;
              zipContents.push({
                path,
                name: entryName,
                size: 0, // Size will be determined on extract
                isSupported: SUPPORTED_INNER_EXTENSIONS.some(
                  (supported) => supported.toLowerCase() === entryExt.toLowerCase()
                ),
              });
            }
          });

          newFiles.push({
            file,
            relativePath,
            displayName: file.name,
            isZip: true,
            zipContents,
            zipExpanded: false,
          });
        } catch {
          // If ZIP reading fails, skip it
          skippedCount++;
          continue;
        }
      } else {
        newFiles.push({
          file,
          relativePath,
          displayName: file.name,
        });
      }
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      await validateAndAddFiles(fileList, false);
    }
    // Reset input
    e.target.value = "";
  }, [validateAndAddFiles]);

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      await validateAndAddFiles(fileList, true); // Mark as folder upload
    }
    // Reset input
    e.target.value = "";
  }, [validateAndAddFiles]);

  // Helper to read all files from a directory entry recursively
  const readDirectoryEntries = useCallback(async (
    dirEntry: FileSystemDirectoryEntry,
    basePath: string
  ): Promise<File[]> => {
    const files: File[] = [];
    const reader = dirEntry.createReader();

    // Read entries in batches (readEntries may not return all at once)
    const readBatch = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    let entries: FileSystemEntry[] = [];
    let batch: FileSystemEntry[];
    do {
      batch = await readBatch();
      entries = entries.concat(batch);
    } while (batch.length > 0);

    for (const entry of entries) {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });
        // Create a new File with the relative path embedded in a custom property
        const fileWithPath = new File([file], file.name, { type: file.type });
        Object.defineProperty(fileWithPath, 'webkitRelativePath', {
          value: basePath ? `${basePath}/${file.name}` : file.name,
          writable: false
        });
        files.push(fileWithPath);
      } else if (entry.isDirectory) {
        const subDirEntry = entry as FileSystemDirectoryEntry;
        const subPath = basePath ? `${basePath}/${entry.name}` : entry.name;
        const subFiles = await readDirectoryEntries(subDirEntry, subPath);
        files.push(...subFiles);
      }
    }

    return files;
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    const items = e.dataTransfer.items;
    const allFiles: File[] = [];
    let isFromFolder = false;

    if (items && items.length > 0) {
      // Use webkitGetAsEntry to properly handle folders
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry?.();

        if (entry) {
          if (entry.isDirectory) {
            isFromFolder = true;
            const dirEntry = entry as FileSystemDirectoryEntry;
            // Read all files from the directory with the folder name as base path
            const dirFiles = await readDirectoryEntries(dirEntry, entry.name);
            allFiles.push(...dirFiles);
          } else if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            const file = await new Promise<File>((resolve, reject) => {
              fileEntry.file(resolve, reject);
            });
            allFiles.push(file);
          }
        }
      }
    }

    // Fallback to regular files if webkitGetAsEntry not available
    if (allFiles.length === 0 && e.dataTransfer.files.length > 0) {
      const fileList = e.dataTransfer.files;
      await validateAndAddFiles(fileList, false);
      return;
    }

    if (allFiles.length > 0) {
      // Create a fake FileList-like object
      const dataTransfer = new DataTransfer();
      allFiles.forEach(f => dataTransfer.items.add(f));
      await validateAndAddFiles(dataTransfer.files, isFromFolder);
    }
  }, [validateAndAddFiles, readDirectoryEntries]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleZipExpanded = useCallback((index: number) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, zipExpanded: !f.zipExpanded } : f
      )
    );
  }, []);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    setIsImporting(false);
    setError("Import annulé");
  }, []);

  const handleImport = async () => {
    if (files.length === 0) return;

    cancelledRef.current = false;
    setIsImporting(true);
    setError(null);
    setProgress(0);
    setResults([]);

    const importResults: ImportResult[] = [];
    const total = files.length;

    // Count total items to import (including ZIP contents)
    let totalItems = 0;
    for (const f of files) {
      if (f.isZip && f.zipContents) {
        totalItems += f.zipContents.filter((c) => c.isSupported).length;
      } else {
        totalItems += 1;
      }
    }

    let processedItems = 0;

    for (let i = 0; i < files.length; i++) {
      // Check if cancelled
      if (cancelledRef.current) {
        break;
      }

      const fileItem = files[i];
      const { file, relativePath, isZip, zipContents } = fileItem;

      // Handle ZIP files - extract and import supported files into a folder named after the ZIP
      if (isZip && zipContents) {
        try {
          const zip = await JSZip.loadAsync(file);

          // Create folder name from ZIP filename (without .zip extension)
          const zipFolderName = file.name.replace(/\.zip$/i, "");

          for (const content of zipContents) {
            if (cancelledRef.current) break;
            if (!content.isSupported) continue;

            // Build full path for ZIP content - place inside folder named after ZIP
            let contentPath = `${zipFolderName}/${content.path}`;
            if (targetFolder) {
              contentPath = `${targetFolder}/${contentPath}`;
            }

            try {
              const zipFile = zip.file(content.path);
              if (!zipFile) throw new Error("File not found in ZIP");

              const contentCategory = getFileCategory(content.name);

              if (contentCategory === "markdown" || contentCategory === "canvas") {
                const text = await zipFile.async("text");
                await githubClient.createNote(contentPath, text);
              } else {
                const base64 = await zipFile.async("base64");
                await githubClient.createBinaryFile(contentPath, base64);
              }

              importResults.push({ path: contentPath, success: true });
            } catch (err) {
              importResults.push({
                path: contentPath,
                success: false,
                error: err instanceof Error ? err.message : "Erreur",
              });
            }

            processedItems++;
            setProgress((processedItems / totalItems) * 100);
            setResults([...importResults]);
          }
        } catch (err) {
          importResults.push({
            path: file.name,
            success: false,
            error: `ZIP error: ${err instanceof Error ? err.message : "Erreur"}`,
          });
          processedItems++;
          setProgress((processedItems / totalItems) * 100);
          setResults([...importResults]);
        }
        continue;
      }

      // Regular file handling
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

      processedItems++;
      setProgress((processedItems / totalItems) * 100);
      setResults([...importResults]);
    }

    setIsImporting(false);

    // Only refresh if not cancelled and something was imported
    if (!cancelledRef.current && importResults.length > 0) {
      triggerTreeRefresh();
    }

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
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isImporting}
                    className="pr-6"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Ajouter
                    <ChevronDown className="h-3 w-3 absolute right-1.5" />
                  </Button>
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-full mt-1 bg-popover border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[140px]">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Fichiers
                    </button>
                    <button
                      onClick={() => folderInputRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Folder className="h-3.5 w-3.5" />
                      Dossier
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_STRING}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
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
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y divide-border">
                {files.map((f, index) => {
                  const IconComponent = getFileIcon(getFileCategory(f.file.name));
                  const supportedInZip = f.zipContents?.filter((c) => c.isSupported).length || 0;
                  const totalInZip = f.zipContents?.length || 0;

                  return (
                    <div key={index}>
                      <div className="flex items-center gap-2 p-2 text-sm">
                        {/* ZIP expand toggle */}
                        {f.isZip && f.zipContents && f.zipContents.length > 0 && (
                          <button
                            onClick={() => toggleZipExpanded(index)}
                            className="shrink-0 p-0.5 hover:bg-muted rounded"
                          >
                            {f.zipExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        )}
                        <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{f.displayName}</p>
                          {f.relativePath && (
                            <p className="text-xs text-muted-foreground truncate">{f.relativePath}/</p>
                          )}
                          {f.isZip && (
                            <p className="text-xs text-muted-foreground">
                              {supportedInZip}/{totalInZip} fichier{totalInZip > 1 ? "s" : ""} supporté{supportedInZip > 1 ? "s" : ""} • sera décompressé
                            </p>
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
                      {/* ZIP contents preview */}
                      {f.isZip && f.zipExpanded && f.zipContents && (
                        <div className="bg-muted/30 border-t border-border/50 px-2 py-1 max-h-32 overflow-y-auto">
                          {f.zipContents.map((content, ci) => (
                            <div
                              key={ci}
                              className={`flex items-center gap-2 py-0.5 text-xs ${
                                content.isSupported ? "text-muted-foreground" : "text-muted-foreground/50 line-through"
                              }`}
                            >
                              <span className="truncate flex-1 pl-4">{content.path}</span>
                              <span className="shrink-0">
                                {content.size > 0 ? `${(content.size / 1024).toFixed(0)} KB` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
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
                onClick={isImporting ? handleCancel : () => handleOpenChange(false)}
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
