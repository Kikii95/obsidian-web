"use client";

import { useState, useCallback } from "react";
import { Download, FileDown, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportStyledPdf, exportPlainTextPdf } from "@/lib/pdf-export";

interface ShareExportToolbarProps {
  content: string;
  fileName: string;
  contentRef?: React.RefObject<HTMLElement | null>;
}

export function ShareExportToolbar({
  content,
  fileName,
  contentRef,
}: ShareExportToolbarProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportMd = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, fileName]);

  const exportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      if (contentRef?.current) {
        await exportStyledPdf(contentRef.current, fileName);
      } else {
        await exportPlainTextPdf(content, fileName);
      }
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [content, fileName, contentRef]);

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [content]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyAll}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copié !" : "Copier le contenu"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportMd}>
          <FileDown className="h-4 w-4 mr-2" />
          Télécharger .md
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdf} disabled={isExportingPdf}>
          {isExportingPdf ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          {isExportingPdf ? "Export..." : "Télécharger .pdf"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
