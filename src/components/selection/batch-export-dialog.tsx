"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, CheckCircle, XCircle, File, Folder, Archive } from "lucide-react";
import { githubClient } from "@/services/github-client";
import type { SelectedItem } from "@/lib/selection-store";
import JSZip from "jszip";

interface BatchExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SelectedItem[];
  onSuccess: () => void;
}

interface ExportResult {
  path: string;
  success: boolean;
  error?: string;
}

// Get all files recursively from a folder
async function getAllFilesInFolder(folderPath: string): Promise<string[]> {
  const files: string[] = [];

  // Get folder contents via tree
  const tree = await githubClient.getTree();

  const findFolder = (items: typeof tree, path: string[]): typeof tree | null => {
    if (path.length === 0) return items;
    const [first, ...rest] = path;
    const folder = items.find((f) => f.type === "dir" && f.name === first);
    if (!folder || !folder.children) return null;
    return findFolder(folder.children, rest);
  };

  const folderContents = findFolder(tree, folderPath.split("/"));
  if (!folderContents) return files;

  const collectFiles = (items: typeof tree, basePath: string) => {
    for (const item of items) {
      const itemPath = basePath ? `${basePath}/${item.name}` : item.name;
      if (item.type === "file") {
        files.push(itemPath);
      } else if (item.children) {
        collectFiles(item.children, itemPath);
      }
    }
  };

  collectFiles(folderContents, folderPath);
  return files;
}

export function BatchExportDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: BatchExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ExportResult[]>([]);
  const [currentItem, setCurrentItem] = useState<string | null>(null);
  const [totalFiles, setTotalFiles] = useState(0);

  const fileCount = items.filter((i) => i.type === "file").length;
  const folderCount = items.filter((i) => i.type === "dir").length;

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setResults([]);

    const exportResults: ExportResult[] = [];
    const zip = new JSZip();

    // First, collect all files to export (including files inside folders)
    const allFiles: { path: string; originalItem: SelectedItem }[] = [];

    for (const item of items) {
      if (item.type === "file") {
        allFiles.push({ path: item.path, originalItem: item });
      } else {
        // Get all files in folder
        try {
          const folderFiles = await getAllFilesInFolder(item.path);
          for (const filePath of folderFiles) {
            allFiles.push({ path: filePath, originalItem: item });
          }
        } catch (error) {
          exportResults.push({
            path: item.path,
            success: false,
            error: `Erreur lecture dossier: ${error instanceof Error ? error.message : "inconnue"}`,
          });
        }
      }
    }

    setTotalFiles(allFiles.length);
    const total = allFiles.length;

    // Download each file and add to zip
    for (let i = 0; i < allFiles.length; i++) {
      const { path } = allFiles[i];
      setCurrentItem(path);

      try {
        // Read file content
        const fileInfo = await githubClient.readNote(path);

        // Determine if binary or text
        const ext = path.split(".").pop()?.toLowerCase() || "";
        const binaryExtensions = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "mp4", "webm", "mov", "avi"];

        if (binaryExtensions.includes(ext) && fileInfo.content) {
          // Binary file - content is base64 encoded
          zip.file(path, fileInfo.content, { base64: true });
        } else {
          // Text file
          zip.file(path, fileInfo.content || "");
        }

        exportResults.push({ path, success: true });
      } catch (error) {
        exportResults.push({
          path,
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }

      setProgress(((i + 1) / total) * 100);
      setResults([...exportResults]);
    }

    setCurrentItem(null);

    // Generate and download zip
    const successCount = exportResults.filter((r) => r.success).length;
    if (successCount > 0) {
      try {
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export-${new Date().toISOString().split("T")[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error generating zip:", error);
      }
    }

    setIsExporting(false);

    // If all succeeded, close
    const allSucceeded = exportResults.every((r) => r.success);
    if (allSucceeded) {
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 500);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onOpenChange(false);
      setResults([]);
      setProgress(0);
      setTotalFiles(0);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const isDone = results.length > 0 && results.length === totalFiles && !isExporting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            {isDone ? "Export terminé" : "Exporter les éléments"}
          </DialogTitle>
          <DialogDescription>
            {isDone ? (
              <>
                {successCount} fichier{successCount > 1 ? "s" : ""} exporté{successCount > 1 ? "s" : ""}
                {failCount > 0 && (
                  <span className="text-destructive">
                    , {failCount} erreur{failCount > 1 ? "s" : ""}
                  </span>
                )}
              </>
            ) : isExporting ? (
              `Export en cours...`
            ) : (
              <>
                Exporter{" "}
                {fileCount > 0 && `${fileCount} fichier${fileCount > 1 ? "s" : ""}`}
                {fileCount > 0 && folderCount > 0 && " et "}
                {folderCount > 0 && `${folderCount} dossier${folderCount > 1 ? "s" : ""}`}
                {" "}en archive ZIP
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Progress */}
          {(isExporting || isDone) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              {currentItem && (
                <p className="text-xs text-muted-foreground truncate">
                  Export de {currentItem}...
                </p>
              )}
            </div>
          )}

          {/* Results list (only show on completion) */}
          {isDone && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map((result) => (
                <div
                  key={result.path}
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

          {/* Items preview (before export) */}
          {!isExporting && !isDone && items.length <= 10 && (
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
              {items.map((item) => (
                <div key={item.path} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.type === "dir" ? (
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <File className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{item.path}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            {isDone ? (
              <Button onClick={handleClose}>Fermer</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleClose} disabled={isExporting}>
                  Annuler
                </Button>
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Export...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger ZIP
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
