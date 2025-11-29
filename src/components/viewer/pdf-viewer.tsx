"use client";

import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface PDFViewerProps {
  content: string; // base64
  fileName: string;
}

export function PDFViewer({ content, fileName }: PDFViewerProps) {
  const dataUrl = `data:application/pdf;base64,${content}`;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = () => {
    window.open(dataUrl, "_blank");
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
            onClick={handleOpenInNewTab}
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
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

      {/* PDF iframe - native browser zoom on mobile */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={dataUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      </div>
    </div>
  );
}
