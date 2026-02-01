/**
 * Notion Markdown to Obsidian Markdown converter
 *
 * Handles:
 * - Remove Notion IDs from filenames (e.g., "Page abc123.md" -> "Page.md")
 * - Convert Notion callouts to Obsidian format
 * - Fix internal links (remove IDs from paths)
 * - Handle images (relative paths)
 */

interface ConvertedFile {
  originalPath: string;
  newPath: string;
  content: string;
}

interface NotionImportResult {
  files: ConvertedFile[];
  images: { path: string; data: Uint8Array }[];
  warnings: string[];
}

// Notion exports files with a hex ID at the end, e.g., "Page Title abc123def456.md"
const NOTION_ID_REGEX = /\s[a-f0-9]{32}(?=\.[a-z]+$|$)/i;

/**
 * Remove Notion ID from filename
 */
export function cleanNotionFilename(filename: string): string {
  return filename.replace(NOTION_ID_REGEX, "");
}

/**
 * Convert a Notion markdown file to Obsidian format
 */
export function convertNotionMarkdown(content: string, fileMap: Map<string, string>): string {
  let result = content;

  // 1. Convert Notion callouts to Obsidian format
  // Notion: > 💡 This is a tip
  // Obsidian: > [!tip] This is a tip
  result = convertCallouts(result);

  // 2. Fix internal links (remove IDs from paths)
  result = fixInternalLinks(result, fileMap);

  // 3. Convert toggle blocks (Notion uses <details>)
  result = convertToggles(result);

  // 4. Clean up empty lines in frontmatter
  result = cleanFrontmatter(result);

  // 5. Fix checkbox syntax if needed
  result = fixCheckboxes(result);

  return result;
}

/**
 * Convert Notion callout syntax to Obsidian callouts
 */
function convertCallouts(content: string): string {
  // Notion uses emoji at the start of blockquotes for callouts
  const calloutMap: Record<string, string> = {
    "💡": "tip",
    "📝": "note",
    "⚠️": "warning",
    "❗": "important",
    "🚨": "danger",
    "ℹ️": "info",
    "❓": "question",
    "✅": "success",
    "❌": "failure",
    "📌": "note",
    "🔥": "important",
    "💭": "quote",
    "📖": "abstract",
    "🎯": "example",
    "🐛": "bug",
  };

  const lines = content.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a blockquote with an emoji
    const match = line.match(/^>\s*([^\s])/);
    if (match) {
      const emoji = match[1];
      const calloutType = calloutMap[emoji];

      if (calloutType) {
        // Replace the emoji with Obsidian callout syntax
        const newLine = line.replace(/^>\s*[^\s]\s*/, `> [!${calloutType}] `);
        result.push(newLine);
        continue;
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

/**
 * Fix internal links by removing Notion IDs from paths
 */
function fixInternalLinks(content: string, fileMap: Map<string, string>): string {
  // Match markdown links: [text](path)
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, path) => {
    // Skip external links
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("mailto:")) {
      return match;
    }

    // Decode URI components
    let decodedPath = decodeURIComponent(path);

    // Check if we have a mapping for this path
    if (fileMap.has(decodedPath)) {
      decodedPath = fileMap.get(decodedPath)!;
    } else {
      // Try to clean the path
      decodedPath = cleanNotionPath(decodedPath);
    }

    // Convert to wikilink if it's a markdown file
    if (decodedPath.endsWith(".md")) {
      const notePath = decodedPath.replace(/\.md$/, "");
      return `[[${notePath}|${text}]]`;
    }

    return `[${text}](${encodeURIComponent(decodedPath)})`;
  });
}

/**
 * Clean a Notion path by removing IDs from each segment
 */
function cleanNotionPath(path: string): string {
  const segments = path.split("/");
  const cleanedSegments = segments.map((segment) => cleanNotionFilename(segment));
  return cleanedSegments.join("/");
}

/**
 * Convert HTML toggle/details blocks to Obsidian callouts with fold
 */
function convertToggles(content: string): string {
  // Notion exports toggles as <details><summary>Title</summary>Content</details>
  return content.replace(
    /<details>\s*<summary>([^<]+)<\/summary>\s*([\s\S]*?)<\/details>/g,
    (_, title, body) => {
      const cleanBody = body.trim();
      return `> [!note]- ${title.trim()}\n> ${cleanBody.split("\n").join("\n> ")}`;
    }
  );
}

/**
 * Clean up frontmatter (remove empty lines, fix formatting)
 */
function cleanFrontmatter(content: string): string {
  // Check if content starts with frontmatter
  if (!content.startsWith("---")) return content;

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) return content;

  const frontmatter = content.slice(0, endIndex + 3);
  const body = content.slice(endIndex + 3);

  // Remove empty lines in frontmatter
  const cleanedFrontmatter = frontmatter
    .split("\n")
    .filter((line) => line.trim() !== "" || line === "---")
    .join("\n");

  return cleanedFrontmatter + body;
}

/**
 * Fix checkbox syntax (Notion uses - [ ] but might have variations)
 */
function fixCheckboxes(content: string): string {
  // Normalize checkbox syntax
  return content
    .replace(/^(\s*)-\s*\[\s*\]/gm, "$1- [ ]")
    .replace(/^(\s*)-\s*\[\s*x\s*\]/gim, "$1- [x]");
}

/**
 * Build a file mapping from original Notion paths to cleaned paths
 */
export function buildFileMap(files: string[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const file of files) {
    const cleanedPath = cleanNotionPath(file);
    map.set(file, cleanedPath);

    // Also map decoded versions
    const decoded = decodeURIComponent(file);
    if (decoded !== file) {
      map.set(decoded, cleanedPath);
    }
  }

  return map;
}

/**
 * Get suggested target folder based on content analysis
 */
export function suggestTargetFolder(files: ConvertedFile[]): string {
  // Look for common patterns in the file structure
  const topLevelFolders = new Set<string>();

  for (const file of files) {
    const parts = file.newPath.split("/");
    if (parts.length > 1) {
      topLevelFolders.add(parts[0]);
    }
  }

  // If there's a single top-level folder, suggest using it
  if (topLevelFolders.size === 1) {
    return `Import/${Array.from(topLevelFolders)[0]}`;
  }

  // Default suggestion
  return "Import/Notion";
}
