import { marked } from "marked";

interface ExportOptions {
  title: string;
  content: string;
  author?: string;
}

interface Chapter {
  title: string;
  content: string;
}

/**
 * Export markdown content to EPUB
 * Uses epub-gen-memory with proper API handling
 */
export async function exportToEpub(options: ExportOptions): Promise<Buffer> {
  const { title, content, author = "Obsidian Web" } = options;

  // Convert markdown to HTML
  const htmlContent = await marked(content, { async: true });

  // Split content into chapters by H1/H2 headings
  const chapters = splitIntoChapters(content);

  // Convert chapters to HTML
  const epubChapters: { title: string; content: string }[] = await Promise.all(
    chapters.map(async (chapter) => ({
      title: chapter.title,
      content: await marked(chapter.content, { async: true }),
    }))
  );

  // If no chapters found, create a single chapter
  if (epubChapters.length === 0) {
    epubChapters.push({
      title: title,
      content: htmlContent,
    });
  }

  // Dynamic import to handle epub-gen-memory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const epubModule = await import("epub-gen-memory") as any;
  const EPub = epubModule.default;

  // Generate EPUB - the library expects content array as second param
  const epub: Buffer = await EPub(
    {
      title,
      author,
      css: epubStyles,
    },
    epubChapters
  );

  return epub;
}

function splitIntoChapters(content: string): Chapter[] {
  const chapters: Chapter[] = [];
  const lines = content.split("\n");

  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for H1 or H2 heading
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);

    if (h1Match || h2Match) {
      // Save previous chapter if exists
      if (currentContent.length > 0 || currentTitle) {
        chapters.push({
          title: currentTitle || "Introduction",
          content: currentContent.join("\n"),
        });
      }

      currentTitle = h1Match?.[1] || h2Match?.[1] || "";
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last chapter
  if (currentContent.length > 0 || currentTitle) {
    chapters.push({
      title: currentTitle || "Content",
      content: currentContent.join("\n"),
    });
  }

  return chapters;
}

const epubStyles = `
body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 1em;
}

h1 {
  font-size: 2em;
  margin-top: 1em;
  margin-bottom: 0.5em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.3em;
}

h2 {
  font-size: 1.5em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

h3 {
  font-size: 1.2em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

p {
  margin-bottom: 1em;
  text-align: justify;
}

pre {
  background: #f5f5f5;
  padding: 1em;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.9em;
  border-radius: 4px;
}

code {
  font-family: monospace;
  font-size: 0.9em;
  background: #f0f0f0;
  padding: 0.1em 0.3em;
  border-radius: 2px;
}

blockquote {
  border-left: 3px solid #ccc;
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: #555;
}

ul, ol {
  margin-bottom: 1em;
  padding-left: 2em;
}

li {
  margin-bottom: 0.3em;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

th, td {
  border: 1px solid #ccc;
  padding: 0.5em;
  text-align: left;
}

th {
  background: #f5f5f5;
  font-weight: bold;
}

img {
  max-width: 100%;
  height: auto;
}

a {
  color: #0066cc;
  text-decoration: underline;
}
`;
