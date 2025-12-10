"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ChevronRight,
  RefreshCw,
  LayoutDashboard,
  Loader2,
  Home,
  Trash2,
} from "lucide-react";
import { githubClient } from "@/services/github-client";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import type { ObsidianCanvasData } from "@/types/canvas";
import { useSettingsStore } from "@/lib/settings-store";

// Lazy load CanvasViewer (React Flow is heavy)
const CanvasViewer = dynamic(
  () =>
    import("@/components/viewer/canvas-viewer").then((mod) => mod.CanvasViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface CanvasData {
  path: string;
  data: ObsidianCanvasData;
  sha: string;
}

export default function CanvasPage() {
  const params = useParams();
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build the file path from slug
  const slug = params.slug as string[];
  const decodedSlug = slug?.map((s) => decodeURIComponent(s)) || [];
  const filePath = decodedSlug.length > 0 ? `${decodedSlug.join("/")}.canvas` : "";

  const fetchCanvas = useCallback(async () => {
    if (!filePath) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await githubClient.readCanvas(filePath);
      setCanvas(data as CanvasData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    fetchCanvas();
  }, [fetchCanvas]);

  const handleSave = useCallback(
    async (newData: ObsidianCanvasData) => {
      if (!canvas) return;

      const result = await githubClient.saveCanvas(
        canvas.path,
        newData,
        canvas.sha
      );

      // Update local state with new sha
      setCanvas((prev) =>
        prev ? { ...prev, data: newData, sha: result.sha } : null
      );
    },
    [canvas]
  );

  // Build breadcrumb
  const breadcrumbs = decodedSlug?.map((part, index) => ({
    name: part,
    path: decodedSlug.slice(0, index + 1).join("/"),
    isLast: index === decodedSlug.length - 1,
  }));

  const fileName = decodedSlug[decodedSlug.length - 1] || "Canvas";

  // Vault root path for Home link
  const { settings } = useSettingsStore();
  const vaultRootPath = settings.vaultRootPath || "";
  const homeHref = vaultRootPath
    ? `/folder/${vaultRootPath.split("/").map(encodeURIComponent).join("/")}`
    : "/folder";

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Skeleton className="h-4 w-20" />
          <ChevronRight className="h-3 w-3" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[70vh] w-full" />
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
            <Button variant="outline" onClick={fetchCanvas}>
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

  if (!canvas) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Canvas non trouvé</h2>
          <Button variant="ghost" asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with breadcrumb and actions */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <Link
            href={homeHref}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Vault Root"
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
                    <LayoutDashboard className="h-4 w-4 text-purple-500" />
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

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <DeleteNoteDialog
            path={canvas.path}
            sha={canvas.sha}
            noteName={fileName}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Canvas Viewer */}
      <div className="flex-1 min-h-0">
        <CanvasViewer
          data={canvas.data}
          fileName={`${fileName}.canvas`}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
