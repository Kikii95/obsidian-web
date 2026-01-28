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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
  depositFolder,
  shareName,
}: DepositUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size for display
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    // Check size
    if (file.size > maxFileSize) {
      return `Trop volumineux (max ${formatSize(maxFileSize)})`;
    }

    // Check type if restricted
    if (allowedTypes && allowedTypes.length > 0) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(ext)) {
        return `Type non autorisé (${ext})`;
      }
    }

    return null;
  };

  // Handle file upload
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setGlobalError(null);
    setErrors([]);
    setUploadProgress(0);

    // Validate files client-side first
    const validFiles: File[] = [];
    const clientErrors: UploadError[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        clientErrors.push({ name: file.name, error });
      } else {
        validFiles.push(file);
      }
    }

    if (clientErrors.length > 0) {
      setErrors(clientErrors);
    }

    if (validFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    // Create FormData
    const formData = new FormData();
    for (const file of validFiles) {
      formData.append("files", file);
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
        return;
      }

      // Add successful uploads to list
      if (data.uploaded && data.uploaded.length > 0) {
        setUploadedFiles((prev) => [...prev, ...data.uploaded]);
      }

      // Add server-side errors
      if (data.errors && data.errors.length > 0) {
        setErrors((prev) => [...prev, ...data.errors]);
      }

      // Update remaining uploads
      if (data.remaining !== undefined) {
        setRemaining(data.remaining);
      }

      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      setGlobalError("Erreur de connexion");
    } finally {
      setIsUploading(false);
    }
  }, [token, maxFileSize, allowedTypes]);

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
      uploadFiles(files);
    }
  }, [uploadFiles]);

  // File input handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadFiles]);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
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

      {/* Constraints info */}
      <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
        <span>Taille max : {formatSize(maxFileSize)}</span>
        {allowedTypes && allowedTypes.length > 0 && (
          <span>Types : {allowedTypes.join(", ")}</span>
        )}
        {remaining !== null && (
          <span className={remaining < 3 ? "text-amber-500" : ""}>
            {remaining} upload{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Global error */}
      {globalError && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{globalError}</p>
        </div>
      )}

      {/* Upload errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">Erreurs</p>
          {errors.map((err, i) => (
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

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Fichiers déposés ({uploadedFiles.length})
          </p>
          <div className="space-y-1">
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
