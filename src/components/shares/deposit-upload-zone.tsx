"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  File,
  Trash2,
  Send,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StagedFile {
  file: File;
  id: string;
  error?: string;
}

interface UploadedFile {
  path: string;
  name: string;
  size: number;
}

interface UploadError {
  name: string;
  error: string;
}

interface DepositUploadZoneProps {
  token: string;
  maxFileSize: number;
  allowedTypes: string[] | null;
  depositFolder: string | null;
  shareName: string;
}

export function DepositUploadZone({
  token,
  maxFileSize,
  allowedTypes,
}: DepositUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Staging area - files waiting to be confirmed
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  // Already uploaded files (this session)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size for display
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate file before staging
  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `Trop volumineux (max ${formatSize(maxFileSize)})`;
    }

    if (allowedTypes && allowedTypes.length > 0) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(ext)) {
        return `Type non autorisé (${ext})`;
      }
    }

    return null;
  };

  // Generate unique ID for staged file
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Add files to staging area (not uploading yet!)
  const stageFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setShowSuccess(false);
    setGlobalError(null);

    const newStagedFiles: StagedFile[] = fileArray.map((file) => ({
      file,
      id: generateId(),
      error: validateFile(file) || undefined,
    }));

    setStagedFiles((prev) => [...prev, ...newStagedFiles]);
  }, [maxFileSize, allowedTypes]);

  // Remove file from staging
  const removeFromStaging = useCallback((id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Clear all staged files
  const clearStaging = useCallback(() => {
    setStagedFiles([]);
    setGlobalError(null);
  }, []);

  // Confirm and upload all valid staged files
  const confirmUpload = useCallback(async () => {
    const validFiles = stagedFiles.filter((sf) => !sf.error);

    if (validFiles.length === 0) {
      setGlobalError("Aucun fichier valide à envoyer");
      return;
    }

    setIsUploading(true);
    setGlobalError(null);
    setUploadErrors([]);
    setUploadProgress(0);

    const formData = new FormData();
    for (const sf of validFiles) {
      formData.append("files", sf.file);
    }

    try {
      const response = await fetch(`/api/shares/${token}/deposit`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setGlobalError(data.error || "Limite de téléchargements atteinte");
        } else if (response.status === 403) {
          setGlobalError(data.error || "Ce partage n'accepte pas les dépôts");
        } else {
          setGlobalError(data.error || "Erreur lors du dépôt");
        }
        setIsUploading(false);
        return;
      }

      // Success! Add to uploaded list
      if (data.uploaded && data.uploaded.length > 0) {
        setUploadedFiles((prev) => [...prev, ...data.uploaded]);
      }

      // Handle server-side errors
      if (data.errors && data.errors.length > 0) {
        setUploadErrors(data.errors);
      }

      // Clear staging and show success
      setStagedFiles([]);
      setShowSuccess(true);
      setUploadProgress(100);

    } catch (error) {
      console.error("Upload error:", error);
      setGlobalError("Erreur de connexion");
    } finally {
      setIsUploading(false);
    }
  }, [stagedFiles, token]);

  // Start new batch (reset success state)
  const startNewBatch = useCallback(() => {
    setShowSuccess(false);
    setUploadErrors([]);
    setGlobalError(null);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      stageFiles(files);
    }
  }, [stageFiles]);

  // File input handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      stageFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [stageFiles]);

  // Count valid staged files
  const validStagedCount = stagedFiles.filter((f) => !f.error).length;
  const invalidStagedCount = stagedFiles.filter((f) => f.error).length;

  return (
    <div className="space-y-6">
      {/* Success message with new batch button */}
      {showSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  Dépôt confirmé !
                </p>
                <p className="text-sm text-muted-foreground">
                  Vos fichiers ont été envoyés avec succès.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={startNewBatch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nouveau dépôt
            </Button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {!showSuccess && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept={allowedTypes?.join(",") || undefined}
          />

          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <p className="text-lg font-medium">Envoi en cours...</p>
              <Progress value={uploadProgress} className="w-48 mx-auto" />
            </div>
          ) : (
            <>
              <Upload
                className={cn(
                  "h-12 w-12 mx-auto mb-4 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-lg font-medium mb-2">
                {isDragging
                  ? "Déposez vos fichiers ici"
                  : "Glissez vos fichiers ici"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour sélectionner
              </p>
              <Button variant="outline" type="button" className="pointer-events-none">
                Parcourir
              </Button>
            </>
          )}
        </div>
      )}

      {/* Constraints info */}
      <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
        <span>Taille max par fichier : {formatSize(maxFileSize)}</span>
        {allowedTypes && allowedTypes.length > 0 && (
          <span>Types : {allowedTypes.join(", ")}</span>
        )}
      </div>

      {/* Staged files (waiting for confirmation) */}
      {stagedFiles.length > 0 && !isUploading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <File className="h-4 w-4" />
              Fichiers en attente ({stagedFiles.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearStaging}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Tout retirer
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stagedFiles.map((sf) => (
              <div
                key={sf.id}
                className={cn(
                  "p-3 rounded-lg flex items-center gap-3 text-sm",
                  sf.error
                    ? "bg-destructive/10 border border-destructive/20"
                    : "bg-muted/50 border border-border"
                )}
              >
                <File
                  className={cn(
                    "h-4 w-4 shrink-0",
                    sf.error ? "text-destructive" : "text-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{sf.file.name}</p>
                  {sf.error ? (
                    <p className="text-xs text-destructive">{sf.error}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {formatSize(sf.file.size)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromStaging(sf.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Confirm button */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {validStagedCount} fichier{validStagedCount > 1 ? "s" : ""} prêt
              {validStagedCount > 1 ? "s" : ""}
              {invalidStagedCount > 0 && (
                <span className="text-destructive">
                  {" "}· {invalidStagedCount} invalide{invalidStagedCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <Button
              onClick={confirmUpload}
              disabled={validStagedCount === 0 || isUploading}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Confirmer le dépôt
            </Button>
          </div>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{globalError}</p>
        </div>
      )}

      {/* Upload errors from server */}
      {uploadErrors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">Erreurs serveur</p>
          {uploadErrors.map((err, i) => (
            <div
              key={i}
              className="p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 text-sm"
            >
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{err.name}</span>
              <span className="text-destructive/80">— {err.error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Previously uploaded files (this session) */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Fichiers déposés cette session ({uploadedFiles.length})
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {uploadedFiles.map((file, i) => (
              <div
                key={i}
                className="p-3 bg-emerald-500/10 rounded-lg flex items-center gap-3 text-sm"
              >
                <FileCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-medium truncate flex-1">{file.name}</span>
                <span className="text-muted-foreground">{formatSize(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
