/**
 * Shared PDF export utilities.
 * Used by use-note-export.ts and share-export-toolbar.tsx to avoid duplication.
 */

/** Apply print-friendly styles to an HTML element for PDF rendering */
export function applyPrintStyles(element: HTMLElement) {
  element.style.padding = "20px";
  element.style.maxWidth = "none";
  element.style.width = "100%";
  element.style.fontSize = "12px";
  element.style.lineHeight = "1.6";
  element.style.color = "#1a1a1a";
  element.style.backgroundColor = "#ffffff";

  // Code blocks
  element.querySelectorAll("pre").forEach((pre) => {
    const el = pre as HTMLElement;
    el.style.backgroundColor = "#f5f5f5";
    el.style.border = "1px solid #e0e0e0";
    el.style.borderRadius = "4px";
    el.style.padding = "12px";
    el.style.overflow = "visible";
    el.style.whiteSpace = "pre-wrap";
    el.style.wordBreak = "break-word";
    el.style.color = "#1a1a1a";
  });

  // Inline code
  element.querySelectorAll("code:not(pre code)").forEach((code) => {
    const el = code as HTMLElement;
    el.style.backgroundColor = "#f0f0f0";
    el.style.padding = "2px 6px";
    el.style.borderRadius = "3px";
    el.style.fontSize = "0.9em";
    el.style.color = "#1a1a1a";
  });

  // Headers
  element.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
    const el = h as HTMLElement;
    el.style.color = "#1a1a1a";
    el.style.marginTop = "1.5em";
    el.style.marginBottom = "0.5em";
  });

  // Text elements
  element.querySelectorAll("p, li, span, div").forEach((el) => {
    (el as HTMLElement).style.color = "#1a1a1a";
  });

  // Links
  element.querySelectorAll("a").forEach((a) => {
    (a as HTMLElement).style.color = "#1a1a1a";
    (a as HTMLElement).style.textDecoration = "underline";
  });

  // Tables
  element.querySelectorAll("table").forEach((table) => {
    const el = table as HTMLElement;
    el.style.borderCollapse = "collapse";
    el.style.width = "100%";
    el.style.marginBottom = "1em";
  });
  element.querySelectorAll("th, td").forEach((cell) => {
    const el = cell as HTMLElement;
    el.style.border = "1px solid #ddd";
    el.style.padding = "8px";
    el.style.textAlign = "left";
    el.style.color = "#1a1a1a";
  });
  element.querySelectorAll("th").forEach((th) => {
    (th as HTMLElement).style.backgroundColor = "#f5f5f5";
    (th as HTMLElement).style.fontWeight = "600";
  });

  // Blockquotes
  element.querySelectorAll("blockquote").forEach((bq) => {
    const el = bq as HTMLElement;
    el.style.borderLeft = "4px solid #ddd";
    el.style.paddingLeft = "16px";
    el.style.margin = "1em 0";
    el.style.color = "#555";
  });

  // Lists
  element.querySelectorAll("ul, ol").forEach((list) => {
    (list as HTMLElement).style.paddingLeft = "24px";
    (list as HTMLElement).style.marginBottom = "1em";
  });

  // Checkboxes
  element.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    (cb as HTMLElement).style.marginRight = "8px";
  });

  // Images
  element.querySelectorAll("img").forEach((img) => {
    (img as HTMLElement).style.maxWidth = "100%";
    (img as HTMLElement).style.height = "auto";
  });

  // Horizontal rules
  element.querySelectorAll("hr").forEach((hr) => {
    (hr as HTMLElement).style.border = "none";
    (hr as HTMLElement).style.borderTop = "1px solid #ddd";
    (hr as HTMLElement).style.margin = "2em 0";
  });
}

/** CSS injected into the cloned document for PDF-compatible colors */
export const PDF_OVERRIDE_CSS = `
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

/** Convert Mermaid SVGs to images in a cloned document for PDF rendering */
export function convertMermaidSvgsToImages(clonedDoc: Document) {
  const mermaidContainers = clonedDoc.querySelectorAll(
    ".mermaid-diagram, .mermaid, [data-mermaid]"
  );

  for (const container of mermaidContainers) {
    const svg = container.querySelector("svg");
    if (!svg) continue;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const base64 = btoa(
        new TextEncoder()
          .encode(svgData)
          .reduce((acc, byte) => acc + String.fromCharCode(byte), "")
      );
      const dataUrl = `data:image/svg+xml;base64,${base64}`;

      const img = clonedDoc.createElement("img");
      img.src = dataUrl;
      img.style.width =
        svg.getAttribute("width") ||
        `${svg.getBoundingClientRect().width}px` ||
        "100%";
      img.style.height = svg.getAttribute("height") || "auto";
      img.style.maxWidth = "100%";
      img.style.display = "block";

      container.replaceChild(img, svg);
    } catch {
      // Skip SVGs that can't be converted
    }
  }
}

/** Build the html2pdf options object */
export function buildHtml2PdfOptions(fileName: string, withMermaid: boolean = false) {
  return {
    margin: [15, 15, 15, 15] as [number, number, number, number],
    filename: `${fileName}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
      onclone: async (clonedDoc: Document) => {
        if (withMermaid) {
          convertMermaidSvgsToImages(clonedDoc);
        }

        // Inject PDF-compatible CSS overrides
        const style = clonedDoc.createElement("style");
        style.textContent = PDF_OVERRIDE_CSS;
        clonedDoc.head.appendChild(style);

        // Apply inline print styles to marked element
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
}

/** Fallback PDF export using jsPDF for plain text content */
export async function exportPlainTextPdf(content: string, fileName: string) {
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

/** Export styled HTML content to PDF using html2pdf.js */
export async function exportStyledPdf(
  element: HTMLElement,
  fileName: string,
  options?: { withMermaid?: boolean }
) {
  const html2pdf = (await import("html2pdf.js")).default;
  const opt = buildHtml2PdfOptions(fileName, options?.withMermaid ?? true);

  element.setAttribute("data-pdf-export", "true");
  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    element.removeAttribute("data-pdf-export");
  }
}

/** Convert base64 content to a Blob URL for efficient memory usage */
export function base64ToBlobUrl(base64: string, mimeType: string): string {
  const byteChars = atob(base64);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteNumbers], { type: mimeType });
  return URL.createObjectURL(blob);
}

/** Trigger a file download from base64 content using Blob URL */
export function downloadBase64File(
  base64: string,
  mimeType: string,
  fileName: string
) {
  const url = base64ToBlobUrl(base64, mimeType);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
