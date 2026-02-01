import { marked } from "marked";

interface ExportOptions {
  title: string;
  content: string;
  styles?: "light" | "dark" | "minimal";
  includeToc?: boolean;
}

/**
 * Export markdown content to styled HTML
 */
export async function exportToHtml(options: ExportOptions): Promise<string> {
  const { title, content, styles = "light", includeToc = true } = options;

  // Convert markdown to HTML
  const htmlContent = await marked(content, { async: true });

  // Generate TOC if enabled
  const toc = includeToc ? generateToc(content) : "";

  // Get theme styles
  const themeStyles = getThemeStyles(styles);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    ${baseStyles}
    ${themeStyles}
  </style>
</head>
<body>
  <article class="content">
    <h1 class="title">${escapeHtml(title)}</h1>
    ${toc ? `<nav class="toc"><h2>Table des matières</h2>${toc}</nav>` : ""}
    <div class="body">
      ${htmlContent}
    </div>
  </article>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateToc(content: string): string {
  const headings: { level: number; text: string; id: string }[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      headings.push({ level, text, id });
    }
  }

  if (headings.length === 0) return "";

  let html = "<ul>";
  let prevLevel = headings[0].level;

  for (const heading of headings) {
    if (heading.level > prevLevel) {
      html += "<ul>".repeat(heading.level - prevLevel);
    } else if (heading.level < prevLevel) {
      html += "</ul>".repeat(prevLevel - heading.level);
    }
    html += `<li><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`;
    prevLevel = heading.level;
  }

  html += "</ul>";
  return html;
}

const baseStyles = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.title {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid;
  padding-bottom: 0.5rem;
}

.toc {
  margin-bottom: 2rem;
  padding: 1rem;
  border-radius: 8px;
}

.toc h2 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.toc ul {
  list-style: none;
  padding-left: 1rem;
}

.toc li {
  margin: 0.25rem 0;
}

.toc a {
  text-decoration: none;
}

.toc a:hover {
  text-decoration: underline;
}

.body h1, .body h2, .body h3, .body h4, .body h5, .body h6 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.body p {
  margin-bottom: 1rem;
}

.body ul, .body ol {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.body pre {
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.body code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.body pre code {
  padding: 0;
  background: none;
}

.body blockquote {
  border-left: 4px solid;
  padding-left: 1rem;
  margin-bottom: 1rem;
  font-style: italic;
}

.body img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.body table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.body th, .body td {
  border: 1px solid;
  padding: 0.5rem;
  text-align: left;
}

.body hr {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid;
}
`;

function getThemeStyles(theme: "light" | "dark" | "minimal"): string {
  switch (theme) {
    case "dark":
      return `
body {
  background: #1a1a2e;
  color: #eaeaea;
}
.title {
  border-color: #4a9eff;
}
.toc {
  background: #16213e;
}
.toc a {
  color: #4a9eff;
}
.body pre {
  background: #0f0f23;
}
.body code {
  background: #16213e;
}
.body blockquote {
  border-color: #4a9eff;
  color: #b0b0b0;
}
.body th, .body td {
  border-color: #333;
}
.body th {
  background: #16213e;
}
.body hr {
  border-color: #333;
}
a {
  color: #4a9eff;
}
`;
    case "minimal":
      return `
body {
  background: #fff;
  color: #333;
}
.title {
  border-color: #333;
}
.toc {
  background: transparent;
  border: 1px solid #ddd;
}
.toc a {
  color: #333;
}
.body pre {
  background: #f5f5f5;
  border: 1px solid #ddd;
}
.body code {
  background: #f5f5f5;
}
.body blockquote {
  border-color: #ddd;
  color: #666;
}
.body th, .body td {
  border-color: #ddd;
}
.body hr {
  border-color: #ddd;
}
a {
  color: #333;
}
`;
    default: // light
      return `
body {
  background: #ffffff;
  color: #333;
}
.title {
  border-color: #6366f1;
}
.toc {
  background: #f8f9fa;
}
.toc a {
  color: #6366f1;
}
.body pre {
  background: #f8f9fa;
}
.body code {
  background: #f1f5f9;
}
.body blockquote {
  border-color: #6366f1;
  color: #666;
}
.body th, .body td {
  border-color: #e5e7eb;
}
.body th {
  background: #f8f9fa;
}
.body hr {
  border-color: #e5e7eb;
}
a {
  color: #6366f1;
}
`;
  }
}
