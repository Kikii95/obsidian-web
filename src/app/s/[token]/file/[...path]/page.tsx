"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, Clock, FileText, Image as ImageIcon, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalLayout, SidebarHeader } from "@/components/layout";
import { getFileType } from "@/lib/file-types";
import type { ShareMode } from "@/types/shares";

interface ShareMetadata {
  folderPath: string;
  folderName: string;
  expiresAt: string;
  mode: ShareMode;
  allowCopy: boolean;
  allowExport: boolean;
}

interface FileData {
  path: string;
  content: string;
  mimeType: string;
}

// Supported extensions to try
const EXTENSIONS_TO_TRY = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf"];

export default function ShareFilePage() {
  const params = useParams();
  const token = params.token as string;
  const pathSegments = params.path as string[];
  const relativePath = pathSegments.map(decodeURIComponent).join("/");

  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch metadata
        const metaRes = await fetch(`/api/shares/${token}`);
        if (!metaRes.ok) {
          const data = await metaRes.json();
          if (data.expired) {
            setExpired(true);
            setError("Ce lien de partage a expiré");
          } else {
            setError(data.error || "Partage non trouvé");
          }
          setLoading(false);
          return;
        }
        const metaData = await metaRes.json();
        setMetadata(metaData.share);

        // Try different extensions
        let fileData = null;
        for (const ext of EXTENSIONS_TO_TRY) {
          const fullPath = `${metaData.share.folderPath}/${relativePath}${ext}`;
          const fileRes = await fetch(
            `/api/shares/${token}/file?path=${encodeURIComponent(fullPath)}`
          );
          if (fileRes.ok) {
            fileData = await fileRes.json();
            break;
          }
        }

        if (!fileData) {
          throw new Error("Fichier non trouvé");
        }

        setFile({
          path: fileData.path,
          content: fileData.content,
          mimeType: fileData.mimeType,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, relativePath]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Chargement du fichier...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {expired ? (
            <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {expired ? "Lien expiré" : "Erreur"}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild variant="outline">
            <Link href={`/s/${token}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au dossier
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!metadata || !file) return null;

  const fileName = file.path.split("/").pop() || relativePath;
  const fileType = getFileType(file.path);
  const dataUrl = `data:${file.mimeType};base64,${file.content}`;

  return (
    <UniversalLayout
      mode="share"
      tree={[]}
      currentPath={file.path}
      metadata={{
        token,
        folderPath: metadata.folderPath,
        folderName: metadata.folderName,
        shareMode: metadata.mode,
        expiresAt: new Date(metadata.expiresAt),
        allowCopy: metadata.allowCopy,
        allowExport: metadata.allowExport,
        ownerName: "",
      }}
      permissions={{
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canCopy: metadata.allowCopy,
        canExport: metadata.allowExport,
        canShare: false,
        isAuthenticated: false,
      }}
      sidebarHeader={
        <SidebarHeader
          title={metadata.folderName || "Dossier partagé"}
          icon={<FolderOpen className="h-5 w-5 text-primary" />}
        />
      }
      showSidebar={false}
    >
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Back button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/s/${token}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        {/* File viewer */}
        <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-background">
            {fileType === "image" ? (
              <ImageIcon className="h-5 w-5 text-emerald-500" />
            ) : (
              <FileText className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">{fileName}</span>
          </div>

          {/* Content */}
          <div className="p-4 flex items-center justify-center min-h-[400px]">
            {fileType === "image" ? (
              <img
                src={dataUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            ) : fileType === "pdf" ? (
              <iframe
                src={dataUrl}
                title={fileName}
                className="w-full h-[70vh] rounded"
              />
            ) : (
              <p className="text-muted-foreground">
                Ce type de fichier ne peut pas être affiché.
              </p>
            )}
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
}
