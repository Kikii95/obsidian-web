"use client";

import { useState, useCallback, RefObject } from "react";
import type { NoteData } from "@/services/github-client";
import { exportStyledPdf, exportPlainTextPdf } from "@/lib/pdf-export";

export type ExportFormat = "md" | "pdf" | "html" | "docx" | "epub";

interface UseNoteExportOptions {
  note: NoteData | null;
  fileName: string;
  currentContent?: string;
  contentRef?: RefObject<HTMLElement | null>;
}

interface UseNoteExportReturn {
  exportMd: () => void;
  exportPdf: () => Promise<void>;
  exportHtml: (theme?: "light" | "dark" | "minimal") => Promise<void>;
  exportDocx: () => Promise<void>;
  exportEpub: () => Promise<void>;
  exportFormat: (format: ExportFormat) => Promise<void>;
  copyAll: () => Promise<void>;
  isExporting: boolean;
  isExportingPdf: boolean;
  copied: boolean;
}

/**
 * Hook for note export functionality (MD, PDF, Copy)
 * PDF export uses html2pdf.js for styled output when contentRef is provided
 */
export function useNoteExport({
  note,
  fileName,
  currentContent,
  contentRef,
}: UseNoteExportOptions): UseNoteExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const content = currentContent ?? note?.content ?? "";

  const exportMd = useCallback(() => {
    if (!note && !content) return;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [note, content, fileName]);

  const exportPdf = useCallback(async () => {
    if (!note && !content) return;

    setIsExportingPdf(true);
    try {
      if (contentRef?.current) {
        await exportStyledPdf(contentRef.current, fileName, {
          withMermaid: true,
        });
      } else {
        await exportPlainTextPdf(content, fileName);
      }
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [note, content, fileName, contentRef]);

  const copyAll = useCallback(async () => {
    if (!note && !content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [note, content]);

  // Export to HTML
  const exportHtml = useCallback(async (theme: "light" | "dark" | "minimal" = "light") => {
    if (!note && !content) return;

    setIsExporting(true);
    try {
      const { exportToHtml } = await import("@/lib/exporters/html");
      const html = await exportToHtml({
        title: fileName,
        content,
        styles: theme,
        includeToc: true,
      });

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("HTML export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [note, content, fileName]);

  // Export to DOCX
  const exportDocx = useCallback(async () => {
    if (!note && !content) return;

    setIsExporting(true);
    try {
      const { exportToDocx } = await import("@/lib/exporters/docx");
      const blob = await exportToDocx({
        title: fileName,
        content,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [note, content, fileName]);

  // Export to EPUB (via API route - requires Node.js)
  const exportEpub = useCallback(async () => {
    if (!note && !content) return;

    setIsExporting(true);
    try {
      const response = await fetch("/api/export/epub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fileName,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error("EPUB export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("EPUB export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [note, content, fileName]);

  // Generic export function
  const exportFormat = useCallback(async (format: ExportFormat) => {
    switch (format) {
      case "md":
        exportMd();
        break;
      case "pdf":
        await exportPdf();
        break;
      case "html":
        await exportHtml();
        break;
      case "docx":
        await exportDocx();
        break;
      case "epub":
        await exportEpub();
        break;
    }
  }, [exportMd, exportPdf, exportHtml, exportDocx, exportEpub]);

  return {
    exportMd,
    exportPdf,
    exportHtml,
    exportDocx,
    exportEpub,
    exportFormat,
    copyAll,
    isExporting,
    isExportingPdf,
    copied,
  };
}
