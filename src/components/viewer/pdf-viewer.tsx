"use client";

import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center gap-6 p-8 h-full">
      {/* PDF Icon */}
      <div className="w-32 h-40 bg-red-500/10 rounded-lg flex items-center justify-center border-2 border-red-500/30">
        <FileText className="h-16 w-16 text-red-500" />
      </div>

      {/* File name */}
      <h2 className="text-xl font-semibold text-center">{fileName}</h2>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleOpenInNewTab} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Ouvrir le PDF
        </Button>
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger
        </Button>
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-md">
        Les PDFs s&apos;ouvrent dans un nouvel onglet pour une meilleure expérience de lecture.
      </p>
    </div>
  );
}
