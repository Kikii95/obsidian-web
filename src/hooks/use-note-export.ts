"use client";

import { useState, useCallback } from "react";
import type { NoteData } from "@/services/github-client";

interface UseNoteExportOptions {
  note: NoteData | null;
  fileName: string;
  currentContent?: string;
}

interface UseNoteExportReturn {
  exportMd: () => void;
  exportPdf: () => Promise<void>;
  copyAll: () => Promise<void>;
  isExportingPdf: boolean;
  copied: boolean;
}

/**
 * Hook for note export functionality (MD, PDF, Copy)
 */
export function useNoteExport({
  note,
  fileName,
  currentContent,
}: UseNoteExportOptions): UseNoteExportReturn {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const content = currentContent ?? note?.content ?? "";

  const exportMd = useCallback(() => {
    if (!note) return;

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
    if (!note) return;

    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;

      // Remove emojis and special unicode (jsPDF only supports basic latin)
      const cleanText = (text: string) => text.replace(/[^\x00-\x7F]/g, "");

      // Title
      pdf.setFontSize(18);
      pdf.text(cleanText(fileName), margin, 20);

      // Content
      pdf.setFontSize(11);
      const cleanContent = cleanText(content);
      const lines = pdf.splitTextToSize(cleanContent, maxWidth);
      let y = 35;
      const lineHeight = 6;
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      }

      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Erreur export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  }, [note, content, fileName]);

  const copyAll = useCallback(async () => {
    if (!note) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [note, content]);

  return {
    exportMd,
    exportPdf,
    copyAll,
    isExportingPdf,
    copied,
  };
}
