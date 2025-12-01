"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronRight, RefreshCw, Image, FileText, Loader2, Home } from "lucide-react";
import { ImageViewer } from "@/components/viewer/image-viewer";
import { getFileType } from "@/lib/file-types";
import { githubClient, type BinaryFileData } from "@/services/github-client";

// Lazy load PDFViewer (react-pdf is heavy ~500kb)
const PDFViewer = dynamic(
  () => import("@/components/viewer/pdf-viewer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico", ".pdf"];

export default function FilePage() {
  const params = useParams();
  const [file, setFile] = useState<BinaryFileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = params.slug as string[];
  // Stable string for dependency comparison
  const slugKey = slug?.join("/") || "";
  const decodedSlug = useMemo(
    () => slug?.map((s) => decodeURIComponent(s)) || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slugKey]
  );

  const fetchFile = useCallback(async () => {
    if (!slugKey) return;

    setIsLoading(true);
    setError(null);

    // Decode the slug parts for file path
    const pathParts = slugKey.split("/").map((s) => decodeURIComponent(s));

    for (const ext of SUPPORTED_EXTENSIONS) {
      const filePath = `${pathParts.join("/")}${ext}`;

      try {
        const data = await githubClient.readBinaryFile(filePath);
        setFile(data);
        setIsLoading(false);
        return;
      } catch {
        // Try next extension
      }
    }

    setError("Fichier non trouvé");
    setIsLoading(false);
  }, [slugKey]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  // Build breadcrumb
  const breadcrumbs = decodedSlug?.map((part, index) => ({
    name: part,
    path: decodedSlug.slice(0, index + 1).join("/"),
    isLast: index === decodedSlug.length - 1,
  }));

  const fileName = file ? file.path.split("/").pop() || "file" : decodedSlug[decodedSlug.length - 1] || "file";
  const fileType = file ? getFileType(file.path) : null;

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Skeleton className="h-4 w-20" />
          <ChevronRight className="h-3 w-3" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Erreur de chargement</h2>
          <p className="text-muted-foreground text-center max-w-md">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchFile}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Image className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Fichier non trouvé</h2>
          <Button variant="ghost" asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm px-4 py-3 border-b border-border/50 shrink-0 overflow-x-auto">
        <Link
          href="/folder"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Vault"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        {breadcrumbs?.map((crumb, index) => {
          const folderPath = `/folder/${crumb.path.split("/").map(encodeURIComponent).join("/")}`;
          return (
            <div key={index} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {crumb.isLast ? (
                <span className="font-medium flex items-center gap-1.5">
                  {fileType === "image" && <Image className="h-4 w-4 text-emerald-500" />}
                  {fileType === "pdf" && <FileText className="h-4 w-4 text-red-500" />}
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={folderPath}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.name}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0">
        {fileType === "image" && (
          <ImageViewer
            content={file.content}
            mimeType={file.mimeType}
            fileName={fileName}
          />
        )}
        {fileType === "pdf" && (
          <PDFViewer content={file.content} fileName={fileName} />
        )}
      </div>
    </div>
  );
}
