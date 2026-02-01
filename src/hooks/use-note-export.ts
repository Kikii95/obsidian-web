"use client";

import { useState, useCallback, RefObject } from "react";
import type { NoteData } from "@/services/github-client";

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
      // If we have a content ref, use html2pdf for styled export
      if (contentRef?.current) {
        const html2pdf = (await import("html2pdf.js")).default;

        // Helper to apply print-friendly styles to an element
        const applyPrintStyles = (element: HTMLElement) => {
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
            (pre as HTMLElement).style.color = "#1a1a1a";
          });

          // Style inline code
          element.querySelectorAll("code:not(pre code)").forEach((code) => {
            (code as HTMLElement).style.backgroundColor = "#f0f0f0";
            (code as HTMLElement).style.padding = "2px 6px";
            (code as HTMLElement).style.borderRadius = "3px";
            (code as HTMLElement).style.fontSize = "0.9em";
            (code as HTMLElement).style.color = "#1a1a1a";
          });

          // Style headers
          element.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
            (h as HTMLElement).style.color = "#1a1a1a";
            (h as HTMLElement).style.marginTop = "1.5em";
            (h as HTMLElement).style.marginBottom = "0.5em";
          });

          // Style paragraphs and text
          element.querySelectorAll("p, li, span, div").forEach((el) => {
            (el as HTMLElement).style.color = "#1a1a1a";
          });

          // Style links
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
            (cell as HTMLElement).style.color = "#1a1a1a";
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
        };

        const opt = {
          margin: [15, 15, 15, 15] as [number, number, number, number],
          filename: `${fileName}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            // This callback is called with the cloned document BEFORE rendering
            onclone: (clonedDoc: Document) => {
              // Add a style tag to force all colors to simple RGB values
              // This overrides any lab/oklch/oklab colors that html2canvas can't parse
              const style = clonedDoc.createElement("style");
              style.textContent = `
                /* Reset all colors to RGB for PDF compatibility */
                * {
                  color: #1a1a1a !important;
                  background-color: transparent !important;
                  border-color: #ddd !important;
                }
                body, .prose, article, main, div {
                  background-color: #ffffff !important;
                }
                pre {
                  background-color: #f8f8f8 !important;
                  border: 1px solid #e0e0e0 !important;
                  border-radius: 6px !important;
                  padding: 12px !important;
                  overflow: visible !important;
                  white-space: pre-wrap !important;
                  word-break: break-word !important;
                  page-break-inside: avoid !important;
                }
                code {
                  background-color: #f0f0f0 !important;
                  color: #1a1a1a !important;
                }
                pre code {
                  background-color: transparent !important;
                  padding: 0 !important;
                }
                a { color: #0066cc !important; text-decoration: underline !important; }
                blockquote {
                  color: #555 !important;
                  border-left: 4px solid #0066cc !important;
                  background-color: #f8f8f8 !important;
                  padding: 8px 16px !important;
                }
                th { background-color: #f5f5f5 !important; }

                /* Page break handling */
                h1, h2, h3, h4, h5, h6 {
                  page-break-after: avoid !important;
                  page-break-inside: avoid !important;
                }
                table, figure, img {
                  page-break-inside: avoid !important;
                }

                /* Syntax highlighting colors (hljs/rehype-highlight) */
                .hljs-comment, .hljs-quote { color: #6a737d !important; font-style: italic; }
                .hljs-keyword, .hljs-selector-tag, .hljs-addition { color: #d73a49 !important; }
                .hljs-string, .hljs-meta .hljs-string, .hljs-regexp, .hljs-attr { color: #22863a !important; }
                .hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable, .hljs-tag .hljs-attr { color: #005cc5 !important; }
                .hljs-doctag { color: #22863a !important; }
                .hljs-title, .hljs-section, .hljs-selector-id { color: #6f42c1 !important; font-weight: bold; }
                .hljs-subst { color: #24292e !important; }
                .hljs-type, .hljs-class .hljs-title { color: #6f42c1 !important; }
                .hljs-name, .hljs-tag { color: #22863a !important; }
                .hljs-attribute { color: #005cc5 !important; }
                .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-attr, .hljs-selector-pseudo { color: #e36209 !important; }
                .hljs-built_in, .hljs-builtin-name { color: #005cc5 !important; }
                .hljs-deletion { color: #b31d28 !important; background-color: #ffeef0 !important; }
                .hljs-addition { color: #22863a !important; background-color: #f0fff4 !important; }
                .hljs-emphasis { font-style: italic; }
                .hljs-strong { font-weight: bold; }
              `;
              clonedDoc.head.appendChild(style);

              // Find our content in the cloned document and apply styles
              const clonedElement = clonedDoc.body.querySelector("[data-pdf-export]");
              if (clonedElement) {
                applyPrintStyles(clonedElement as HTMLElement);
              }
            },
          },
          jsPDF: {
            unit: "mm" as const,
            format: "a4" as const,
            orientation: "portrait" as const,
          },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        };

        // Mark the element for the onclone callback to find
        contentRef.current.setAttribute("data-pdf-export", "true");

        await html2pdf().set(opt).from(contentRef.current).save();

        // Clean up
        contentRef.current.removeAttribute("data-pdf-export");
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
      alert("Erreur lors de l'export HTML");
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
      alert("Erreur lors de l'export DOCX");
    } finally {
      setIsExporting(false);
    }
  }, [note, content, fileName]);

  // Export to EPUB
  const exportEpub = useCallback(async () => {
    if (!note && !content) return;

    setIsExporting(true);
    try {
      const { exportToEpub } = await import("@/lib/exporters/epub");
      const epub = await exportToEpub({
        title: fileName,
        content,
      });

      // Cast Buffer to Uint8Array for Blob compatibility
      const blob = new Blob([new Uint8Array(epub)], { type: "application/epub+zip" });
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
      alert("Erreur lors de l'export EPUB");
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
