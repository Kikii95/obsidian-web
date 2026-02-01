"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Upload,
  FileArchive,
  FileText,
  Folder,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cleanNotionFilename,
  convertNotionMarkdown,
  buildFileMap,
  suggestTargetFolder,
} from "@/lib/importers/notion";
import JSZip from "jszip";

type ImportStep = "upload" | "preview" | "configure" | "importing" | "complete";

interface ConvertedFile {
  originalPath: string;
  newPath: string;
  content: string;
}

interface ImportImage {
  path: string;
  data: Uint8Array;
}

interface ImportState {
  files: ConvertedFile[];
  images: ImportImage[];
  warnings: string[];
  targetFolder: string;
}

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [importState, setImportState] = useState<ImportState>({
    files: [],
    images: [],
    warnings: [],
    targetFolder: "Import/Notion",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith(".zip")) {
      setError("Veuillez sélectionner un fichier ZIP exporté depuis Notion");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Read and parse the ZIP file
      const zip = await JSZip.loadAsync(file);
      const files: ConvertedFile[] = [];
      const images: ImportImage[] = [];
      const warnings: string[] = [];
      const allPaths: string[] = [];

      // First pass: collect all file paths
      zip.forEach((relativePath) => {
        allPaths.push(relativePath);
      });

      // Build file mapping
      const fileMap = buildFileMap(allPaths);

      // Second pass: process files
      const entries = Object.entries(zip.files);
      let processed = 0;

      for (const [path, zipEntry] of entries) {
        if (zipEntry.dir) continue;

        const cleanedPath = fileMap.get(path) || cleanNotionFilename(path);

        if (path.endsWith(".md")) {
          // Process markdown file
          const content = await zipEntry.async("string");
          const convertedContent = convertNotionMarkdown(content, fileMap);

          files.push({
            originalPath: path,
            newPath: cleanedPath,
            content: convertedContent,
          });
        } else if (path.endsWith(".html")) {
          // Convert HTML to basic markdown (simplified)
          const htmlContent = await zipEntry.async("string");
          // Skip HTML files or convert if needed
          warnings.push(`HTML ignoré: ${path} (exporter en Markdown depuis Notion)`);
        } else if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path)) {
          // Collect images
          const data = await zipEntry.async("uint8array");
          images.push({
            path: cleanedPath,
            data,
          });
        }

        processed++;
        setProgress((processed / entries.length) * 100);
      }

      // Check if we found any files to import
      if (files.length === 0) {
        const htmlCount = warnings.filter(w => w.includes("HTML ignoré")).length;
        if (htmlCount > 0) {
          setError(
            `Aucun fichier Markdown trouvé. ${htmlCount} fichier(s) HTML détecté(s). ` +
            `Veuillez ré-exporter depuis Notion en sélectionnant "Markdown & CSV" au lieu de "HTML".`
          );
        } else {
          setError(
            "Aucun fichier compatible trouvé dans l'archive ZIP. " +
            "Assurez-vous d'exporter depuis Notion en format Markdown & CSV."
          );
        }
        return;
      }

      // Update state
      const suggestedFolder = suggestTargetFolder(files);
      setImportState({
        files,
        images,
        warnings,
        targetFolder: suggestedFolder,
      });

      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la lecture du fichier");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle import
  const handleImport = async () => {
    const total = importState.files.length + importState.images.length;

    // Safety check - should not happen if preview worked correctly
    if (total === 0) {
      setError("Aucun fichier à importer. Veuillez recommencer.");
      return;
    }

    setStep("importing");
    setProgress(0);
    setError(null);

    try {
      let completed = 0;
      let success = 0;
      let failed = 0;

      // Import files
      for (const file of importState.files) {
        try {
          const targetPath = `${importState.targetFolder}/${file.newPath}`;

          const res = await fetch("/api/github/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: targetPath,
              content: file.content,
              commitMessage: `[import] Import from Notion: ${file.newPath}`,
            }),
          });

          if (!res.ok) throw new Error("Failed to save");
          success++;
        } catch {
          failed++;
        }

        completed++;
        setProgress((completed / total) * 100);
      }

      // Import images
      for (const image of importState.images) {
        try {
          const targetPath = `${importState.targetFolder}/${image.path}`;

          // Convert Uint8Array to base64
          const base64 = btoa(
            String.fromCharCode.apply(null, Array.from(image.data))
          );

          const res = await fetch("/api/github/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: targetPath,
              content: base64,
              encoding: "base64",
              commitMessage: `[import] Import image from Notion: ${image.path}`,
            }),
          });

          if (!res.ok) throw new Error("Failed to save");
          success++;
        } catch {
          failed++;
        }

        completed++;
        setProgress((completed / total) * 100);
      }

      setImportResult({ success, failed });
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
      setStep("configure");
    }
  };

  // Reset
  const handleReset = () => {
    setStep("upload");
    setImportState({
      files: [],
      images: [],
      warnings: [],
      targetFolder: "Import/Notion",
    });
    setProgress(0);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <span className="text-muted-foreground">|</span>
        <Download className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Importer depuis Notion</h1>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(["upload", "preview", "configure", "complete"] as const).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["complete", step].indexOf(s) !== -1 ||
                    i <
                      ["upload", "preview", "configure", "importing", "complete"].indexOf(step)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>1. Télécharger l&apos;export Notion</CardTitle>
            <CardDescription>
              Exportez votre espace Notion en Markdown puis téléchargez le fichier ZIP ici.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                "hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
                isProcessing && "pointer-events-none opacity-50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />

              {isProcessing ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  <p>Analyse du fichier...</p>
                  <Progress value={progress} className="max-w-xs mx-auto" />
                </div>
              ) : (
                <>
                  <FileArchive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    Glissez votre fichier ZIP ici
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ou cliquez pour sélectionner
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Comment exporter depuis Notion :</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Ouvrez Notion et allez dans Settings & Members</li>
                <li>Cliquez sur "Export all workspace content"</li>
                <li>Sélectionnez "Markdown & CSV" comme format</li>
                <li>Téléchargez et uploadez le ZIP ici</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>2. Aperçu de l&apos;import</CardTitle>
            <CardDescription>
              {importState.files.length} notes et {importState.images.length} images
              seront importées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Warnings */}
            {importState.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 rounded-lg">
                <h4 className="font-medium text-yellow-500 mb-2">Avertissements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {importState.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {importState.warnings.length > 5 && (
                    <li>...et {importState.warnings.length - 5} autres</li>
                  )}
                </ul>
              </div>
            )}

            {/* Files preview */}
            <h4 className="font-medium mb-2">Notes à importer</h4>
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-1">
                {importState.files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.newPath}</p>
                      {file.originalPath !== file.newPath && (
                        <p className="text-xs text-muted-foreground truncate">
                          ← {file.originalPath}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                Annuler
              </Button>
              <Button onClick={() => setStep("configure")}>
                Continuer
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Configure */}
      {step === "configure" && (
        <Card>
          <CardHeader>
            <CardTitle>3. Configuration</CardTitle>
            <CardDescription>
              Choisissez où importer vos notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetFolder">Dossier de destination</Label>
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="targetFolder"
                    value={importState.targetFolder}
                    onChange={(e) =>
                      setImportState((s) => ({ ...s, targetFolder: e.target.value }))
                    }
                    placeholder="Import/Notion"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Les notes seront créées dans ce dossier de votre vault.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Résumé</h4>
                <div className="flex gap-4 text-sm">
                  <Badge variant="secondary">
                    <FileText className="h-3 w-3 mr-1" />
                    {importState.files.length} notes
                  </Badge>
                  <Badge variant="secondary">
                    {importState.images.length} images
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")}>
                Retour
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <Card>
          <CardHeader>
            <CardTitle>Import en cours...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground mb-4">
                Import des fichiers vers votre vault...
              </p>
              <Progress value={progress} className="max-w-md mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round(progress)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {step === "complete" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-6 w-6 text-green-500" />
              Import terminé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {importResult.success}
                  </p>
                  <p className="text-sm text-muted-foreground">Importés</p>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-destructive">
                      {importResult.failed}
                    </p>
                    <p className="text-sm text-muted-foreground">Échoués</p>
                  </div>
                )}
              </div>

              <p className="text-muted-foreground mb-6">
                Vos notes ont été importées dans <strong>{importState.targetFolder}</strong>
              </p>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleReset}>
                  Nouvel import
                </Button>
                <Button asChild>
                  <Link href={`/folder/${encodeURIComponent(importState.targetFolder)}`}>
                    Voir les notes
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
