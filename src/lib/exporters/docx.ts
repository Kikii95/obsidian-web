import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  TableRow,
  TableCell,
  Table,
  WidthType,
  BorderStyle,
  Packer,
  AlignmentType,
} from "docx";

interface ExportOptions {
  title: string;
  content: string;
}

interface ParsedElement {
  type: "heading" | "paragraph" | "list" | "code" | "quote" | "table" | "hr";
  level?: number;
  content: string;
  items?: string[];
  rows?: string[][];
  ordered?: boolean;
}

/**
 * Export markdown content to DOCX
 */
export async function exportToDocx(options: ExportOptions): Promise<Blob> {
  const { title, content } = options;

  // Parse markdown into structured elements
  const elements = parseMarkdown(content);

  // Convert elements to docx paragraphs
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    }),
  ];

  for (const element of elements) {
    const docxElements = elementToDocx(element);
    children.push(...docxElements);
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function parseMarkdown(content: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      elements.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push({
        type: "code",
        content: codeLines.join("\n"),
      });
      i++;
      continue;
    }

    // Blockquotes
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      elements.push({
        type: "quote",
        content: quoteLines.join("\n"),
      });
      continue;
    }

    // Unordered lists
    if (line.match(/^[-*+]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s/)) {
        items.push(lines[i].replace(/^[-*+]\s/, ""));
        i++;
      }
      elements.push({
        type: "list",
        content: "",
        items,
        ordered: false,
      });
      continue;
    }

    // Ordered lists
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push({
        type: "list",
        content: "",
        items,
        ordered: true,
      });
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|_{3,}|\*{3,})$/)) {
      elements.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // Tables
    if (line.includes("|") && lines[i + 1]?.match(/^\|?[\s-:|]+\|$/)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        // Skip separator row
        if (lines[i].match(/^\|?[\s-:|]+\|$/)) {
          i++;
          continue;
        }
        const cells = lines[i]
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);
        rows.push(cells);
        i++;
      }
      elements.push({
        type: "table",
        content: "",
        rows,
      });
      continue;
    }

    // Regular paragraph
    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].match(/^[#>|-]|\d+\./) &&
      !lines[i].startsWith("```")
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    elements.push({
      type: "paragraph",
      content: paragraphLines.join(" "),
    });
  }

  return elements;
}

function elementToDocx(element: ParsedElement): (Paragraph | Table)[] {
  switch (element.type) {
    case "heading":
      return [
        new Paragraph({
          text: cleanMarkdownInline(element.content),
          heading: getHeadingLevel(element.level || 1),
          spacing: { before: 240, after: 120 },
        }),
      ];

    case "paragraph":
      return [
        new Paragraph({
          children: parseInlineFormatting(element.content),
          spacing: { after: 200 },
        }),
      ];

    case "code":
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: element.content,
              font: "Consolas",
              size: 20,
            }),
          ],
          spacing: { before: 200, after: 200 },
          shading: { fill: "f5f5f5" },
        }),
      ];

    case "quote":
      return [
        new Paragraph({
          children: parseInlineFormatting(element.content),
          indent: { left: 720 },
          spacing: { before: 200, after: 200 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: "999999" },
          },
        }),
      ];

    case "list":
      return (element.items || []).map(
        (item, index) =>
          new Paragraph({
            children: parseInlineFormatting(item),
            bullet: element.ordered
              ? undefined
              : { level: 0 },
            numbering: element.ordered
              ? { reference: "default", level: 0 }
              : undefined,
            spacing: { after: 80 },
          })
      );

    case "table":
      if (!element.rows || element.rows.length === 0) return [];
      return [
        new Table({
          rows: element.rows.map(
            (row, rowIndex) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: parseInlineFormatting(cell),
                          alignment:
                            rowIndex === 0
                              ? AlignmentType.CENTER
                              : AlignmentType.LEFT,
                        }),
                      ],
                      shading:
                        rowIndex === 0
                          ? { fill: "f0f0f0" }
                          : undefined,
                    })
                ),
              })
          ),
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ];

    case "hr":
      return [
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
          },
          spacing: { before: 200, after: 200 },
        }),
      ];

    default:
      return [];
  }
}

function getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    case 6:
      return HeadingLevel.HEADING_6;
    default:
      return HeadingLevel.HEADING_1;
  }
}

function cleanMarkdownInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "[$1]");
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let remaining = text;

  // Simple regex-based parsing
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, style: { bold: true } },
    { regex: /\*([^*]+)\*/g, style: { italics: true } },
    { regex: /`([^`]+)`/g, style: { font: "Consolas" } },
  ];

  // For simplicity, just clean and return single run
  // A more complex implementation would handle nested formatting
  runs.push(
    new TextRun({
      text: cleanMarkdownInline(remaining),
    })
  );

  return runs;
}
