"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";

interface ImageViewerProps {
  content: string; // base64
  mimeType: string;
  fileName: string;
}

export function ImageViewer({ content, mimeType, fileName }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const dataUrl = `data:${mimeType};base64,${content}`;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <span className="text-sm font-medium truncate max-w-[200px]">
          {fileName}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
            title="Zoom -"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[40px] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
            title="Zoom +"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRotate}
            title="Rotation"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReset}
            title="Reset"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            title="Télécharger"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/10">
        <img
          src={dataUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform duration-200"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
