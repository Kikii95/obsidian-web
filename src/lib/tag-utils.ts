/**
 * Tag utilities for extracting inline tags and merging with frontmatter
 */

// Regex to match inline tags (e.g., #tag, #my-tag, #Tag123)
// Excludes hex colors (#fff, #aabbcc) and headings
const INLINE_TAG_REGEX = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;

// Tags to exclude (common false positives)
const EXCLUDED_PATTERNS = [
  /^[0-9a-fA-F]{3,6}$/, // Hex colors
];

/**
 * Extract inline tags from note content
 * Returns array of tags without the # prefix
 */
export function extractInlineTags(content: string): string[] {
  // Remove code blocks and inline code to avoid false positives
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/`[^`]+`/g, "") // Inline code
    .replace(/^\s*#+ .+$/gm, ""); // Headings

  const matches = cleanContent.matchAll(INLINE_TAG_REGEX);
  const tags: Set<string> = new Set();

  for (const match of matches) {
    const tag = match[1];
    // Skip excluded patterns
    const isExcluded = EXCLUDED_PATTERNS.some((pattern) => pattern.test(tag));
    if (!isExcluded && tag.length >= 2) {
      tags.add(tag.toLowerCase());
    }
  }

  return Array.from(tags).sort();
}

/**
 * Parse frontmatter from content
 * Returns { frontmatter: object, body: string } or null if no frontmatter
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  raw: string;
} | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;

  const raw = match[1];
  const body = content.slice(match[0].length);

  // Simple YAML-like parsing (handles arrays and strings)
  const frontmatter: Record<string, unknown> = {};
  const lines = raw.split("\n");
  let currentKey = "";
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Array item
    if (line.match(/^\s+-\s+(.+)$/) && currentArray !== null) {
      const value = line.replace(/^\s+-\s+/, "").trim();
      currentArray.push(value.replace(/^["']|["']$/g, ""));
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if any
      if (currentArray !== null && currentKey) {
        frontmatter[currentKey] = currentArray;
      }

      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      // Check if starting an array
      if (value === "" || value === "[]") {
        currentArray = [];
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // Inline array
        const items = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
        frontmatter[currentKey] = items;
        currentArray = null;
      } else {
        frontmatter[currentKey] = value.replace(/^["']|["']$/g, "");
        currentArray = null;
      }
    }
  }

  // Save last array if any
  if (currentArray !== null && currentKey) {
    frontmatter[currentKey] = currentArray;
  }

  return { frontmatter, body, raw };
}

/**
 * Serialize frontmatter object back to YAML string
 */
export function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else if (typeof value === "string") {
      // Quote if contains special chars
      if (value.includes(":") || value.includes("#") || value.includes("'")) {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else if (value !== undefined && value !== null) {
      lines.push(`${key}: ${String(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Merge inline tags into frontmatter tags
 * Returns updated content with merged tags in frontmatter
 */
export function mergeInlineTagsToFrontmatter(content: string): string {
  const inlineTags = extractInlineTags(content);

  // No inline tags found
  if (inlineTags.length === 0) {
    return content;
  }

  const parsed = parseFrontmatter(content);

  if (parsed) {
    // Has existing frontmatter
    const existingTags = (parsed.frontmatter.tags as string[]) || [];
    const normalizedExisting = existingTags.map((t) => t.toLowerCase());

    // Merge tags (add new ones, keep existing)
    const newTags = inlineTags.filter(
      (tag) => !normalizedExisting.includes(tag)
    );

    if (newTags.length === 0) {
      return content; // No new tags to add
    }

    const mergedTags = [...existingTags, ...newTags].sort();
    const updatedFrontmatter = { ...parsed.frontmatter, tags: mergedTags };
    const newFrontmatterStr = serializeFrontmatter(updatedFrontmatter);

    return `---\n${newFrontmatterStr}\n---\n${parsed.body}`;
  } else {
    // No frontmatter - create one with tags
    const newFrontmatter = { tags: inlineTags };
    const frontmatterStr = serializeFrontmatter(newFrontmatter);
    return `---\n${frontmatterStr}\n---\n\n${content}`;
  }
}
