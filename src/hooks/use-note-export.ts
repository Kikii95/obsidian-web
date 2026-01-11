"use client";

import { useState, useCallback, RefObject } from "react";
import type { NoteData } from "@/services/github-client";

interface UseNoteExportOptions {
  note: NoteData | null;
  fileName: string;
  currentContent?: string;
  contentRef?: RefObject<HTMLElement | null>;
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
 * PDF export uses html2pdf.js for styled output when contentRef is provided
 */
export function useNoteExport({
  note,
  fileName,
  currentContent,
  contentRef,
}: UseNoteExportOptions): UseNoteExportReturn {
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
      // If we have a content ref, use html2pdf for styled export
      if (contentRef?.current) {
        const html2pdf = (await import("html2pdf.js")).default;

        // Clone the element to avoid modifying the original
        const element = contentRef.current.cloneNode(true) as HTMLElement;

        // Convert CSS lab/oklch/oklab colors to RGB (html2canvas doesn't support them)
        // Get computed styles from ORIGINAL elements (in DOM), then apply to cloned
        const sanitizeColors = (original: HTMLElement, clone: HTMLElement) => {
          const computed = window.getComputedStyle(original);
          const colorProps = ["color", "background-color", "border-color", "border-top-color", "border-bottom-color", "border-left-color", "border-right-color"];

          for (const prop of colorProps) {
            const value = computed.getPropertyValue(prop);
            if (value && (value.includes("lab(") || value.includes("oklch(") || value.includes("oklab("))) {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.fillStyle = value;
                clone.style.setProperty(prop, ctx.fillStyle);
              }
            }
          }
          const originalChildren = Array.from(original.children);
          const cloneChildren = Array.from(clone.children);
          for (let i = 0; i < originalChildren.length; i++) {
            if (cloneChildren[i]) {
              sanitizeColors(originalChildren[i] as HTMLElement, cloneChildren[i] as HTMLElement);
            }
          }
        };
        sanitizeColors(contentRef.current, element);

        // Apply print-friendly styles
        element.style.padding = "20px";
        element.style.maxWidth = "none";
        element.style.width = "100%";
        element.style.fontSize = "12px";
        element.style.lineHeight = "1.6";
        element.style.color = "#1a1a1a";
        element.style.backgroundColor = "#ffffff";

        // Style code blocks for print
        element.querySelectorAll("pre").forEach((pre) => {
          (pre as HTMLElement).style.backgroundColor = "#f5f5f5";
          (pre as HTMLElement).style.border = "1px solid #e0e0e0";
          (pre as HTMLElement).style.borderRadius = "4px";
          (pre as HTMLElement).style.padding = "12px";
          (pre as HTMLElement).style.overflow = "visible";
          (pre as HTMLElement).style.whiteSpace = "pre-wrap";
          (pre as HTMLElement).style.wordBreak = "break-word";
        });

        // Style inline code
        element.querySelectorAll("code:not(pre code)").forEach((code) => {
          (code as HTMLElement).style.backgroundColor = "#f0f0f0";
          (code as HTMLElement).style.padding = "2px 6px";
          (code as HTMLElement).style.borderRadius = "3px";
          (code as HTMLElement).style.fontSize = "0.9em";
        });

        // Style headers
        element.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
          (h as HTMLElement).style.color = "#1a1a1a";
          (h as HTMLElement).style.marginTop = "1.5em";
          (h as HTMLElement).style.marginBottom = "0.5em";
        });

        // Style links (remove blue, show URL)
        element.querySelectorAll("a").forEach((a) => {
          (a as HTMLElement).style.color = "#1a1a1a";
          (a as HTMLElement).style.textDecoration = "underline";
        });

        // Style tables
        element.querySelectorAll("table").forEach((table) => {
          (table as HTMLElement).style.borderCollapse = "collapse";
          (table as HTMLElement).style.width = "100%";
          (table as HTMLElement).style.marginBottom = "1em";
        });
        element.querySelectorAll("th, td").forEach((cell) => {
          (cell as HTMLElement).style.border = "1px solid #ddd";
          (cell as HTMLElement).style.padding = "8px";
          (cell as HTMLElement).style.textAlign = "left";
        });
        element.querySelectorAll("th").forEach((th) => {
          (th as HTMLElement).style.backgroundColor = "#f5f5f5";
          (th as HTMLElement).style.fontWeight = "600";
        });

        // Style blockquotes
        element.querySelectorAll("blockquote").forEach((bq) => {
          (bq as HTMLElement).style.borderLeft = "4px solid #ddd";
          (bq as HTMLElement).style.paddingLeft = "16px";
          (bq as HTMLElement).style.margin = "1em 0";
          (bq as HTMLElement).style.color = "#555";
        });

        // Style lists
        element.querySelectorAll("ul, ol").forEach((list) => {
          (list as HTMLElement).style.paddingLeft = "24px";
          (list as HTMLElement).style.marginBottom = "1em";
        });

        // Style checkboxes (task lists)
        element.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          (cb as HTMLElement).style.marginRight = "8px";
        });

        // Style images
        element.querySelectorAll("img").forEach((img) => {
          (img as HTMLElement).style.maxWidth = "100%";
          (img as HTMLElement).style.height = "auto";
        });

        // Style horizontal rules
        element.querySelectorAll("hr").forEach((hr) => {
          (hr as HTMLElement).style.border = "none";
          (hr as HTMLElement).style.borderTop = "1px solid #ddd";
          (hr as HTMLElement).style.margin = "2em 0";
        });

        const opt = {
          margin: [15, 15, 15, 15] as [number, number, number, number],
          filename: `${fileName}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
          },
          jsPDF: {
            unit: "mm" as const,
            format: "a4" as const,
            orientation: "portrait" as const,
          },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        };

        await html2pdf().set(opt).from(element).save();
      } else {
        // Fallback to basic jsPDF for raw text
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF("p", "mm", "a4");

        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const maxWidth = pageWidth - margin * 2;

        // Title
        pdf.setFontSize(18);
        pdf.text(fileName, margin, 20);

        // Content
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(content, maxWidth);
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
      }
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Erreur lors de l'export PDF");
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

  return {
    exportMd,
    exportPdf,
    copyAll,
    isExportingPdf,
    copied,
  };
}
