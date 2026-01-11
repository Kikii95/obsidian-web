"use client";

import { useState, useRef, useCallback } from "react";
import { Download, FileDown, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        const html2pdf = (await import("html2pdf.js")).default;
        const element = contentRef.current.cloneNode(true) as HTMLElement;

        // Convert CSS lab/oklch/oklab colors to RGB (html2canvas doesn't support them)
        const sanitizeColors = (el: HTMLElement) => {
          const computed = window.getComputedStyle(el);
          const colorProps = ["color", "backgroundColor", "borderColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor"];

          for (const prop of colorProps) {
            const value = computed.getPropertyValue(prop);
            if (value && (value.includes("lab(") || value.includes("oklch(") || value.includes("oklab("))) {
              // Force conversion by setting then getting the computed value via canvas
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.fillStyle = value;
                // ctx.fillStyle will be converted to RGB format
                el.style.setProperty(prop, ctx.fillStyle);
              }
            }
          }

          // Recursively process children
          for (const child of Array.from(el.children)) {
            sanitizeColors(child as HTMLElement);
          }
        };

        sanitizeColors(element);

        // Apply print-friendly styles
        element.style.padding = "20px";
        element.style.maxWidth = "none";
        element.style.width = "100%";
        element.style.fontSize = "12px";
        element.style.lineHeight = "1.6";
        element.style.color = "#1a1a1a";
        element.style.backgroundColor = "#ffffff";

        // Style code blocks
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
        });

        // Style headers
        element.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
          (h as HTMLElement).style.color = "#1a1a1a";
        });

        // Style tables
        element.querySelectorAll("table").forEach((table) => {
          (table as HTMLElement).style.borderCollapse = "collapse";
          (table as HTMLElement).style.width = "100%";
        });
        element.querySelectorAll("th, td").forEach((cell) => {
          (cell as HTMLElement).style.border = "1px solid #ddd";
          (cell as HTMLElement).style.padding = "8px";
        });

        // Style blockquotes
        element.querySelectorAll("blockquote").forEach((bq) => {
          (bq as HTMLElement).style.borderLeft = "4px solid #ddd";
          (bq as HTMLElement).style.paddingLeft = "16px";
          (bq as HTMLElement).style.color = "#555";
        });

        const opt = {
          margin: [15, 15, 15, 15] as [number, number, number, number],
          filename: `${fileName}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        };

        await html2pdf().set(opt).from(element).save();
      } else {
        // Fallback to basic jsPDF
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const maxWidth = pageWidth - margin * 2;

        pdf.setFontSize(18);
        pdf.text(fileName, margin, 20);

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
