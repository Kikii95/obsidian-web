"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy load Excalidraw to reduce bundle size
const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({
    default: mod.Excalidraw,
  }))
);

interface ExcalidrawData {
  type: string;
  version: number;
  source: string;
  elements: unknown[];
  appState?: {
    viewBackgroundColor?: string;
    theme?: "light" | "dark";
  };
  files?: Record<string, unknown>;
}

interface ExcalidrawViewerProps {
  src: string;
  className?: string;
  title?: string;
}

export function ExcalidrawViewer({ src, className, title }: ExcalidrawViewerProps) {
  const [data, setData] = useState<ExcalidrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const displayTitle = title || src.split("/").pop()?.replace(".excalidraw", "") || "Drawing";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error("Failed to load Excalidraw file");
        }

        const text = await response.text();
        const parsed = JSON.parse(text) as ExcalidrawData;

        if (!parsed.type || parsed.type !== "excalidraw") {
          throw new Error("Invalid Excalidraw file format");
        }

        setData(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [src]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  const handleExportPng = async () => {
    // This would require the exportToBlob function from Excalidraw
    // For now, we'll just show an alert
    alert("Export PNG coming soon");
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[300px] bg-muted/30 rounded-lg border border-border/50",
          className
        )}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading drawing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "p-4 rounded-lg bg-destructive/10 text-destructive text-sm",
          className
        )}
      >
        <p className="font-medium">Error loading Excalidraw</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 overflow-hidden bg-background",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
        <span className="text-sm font-medium truncate">
          ✏️ {displayTitle}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleReset}
            title="Reset zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border/50 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleExportPng}
            title="Export PNG"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative overflow-hidden"
        style={{
          height: "400px",
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <Excalidraw
            initialData={{
              elements: data.elements as any,
              appState: {
                ...data.appState,
                viewModeEnabled: true,
                zenModeEnabled: true,
              },
              files: data.files as any,
            }}
            viewModeEnabled={true}
            zenModeEnabled={true}
            gridModeEnabled={false}
            theme="dark"
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas: false,
                export: false,
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
                saveAsImage: false,
              },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
