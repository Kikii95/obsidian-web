import type { WikiLink } from "@/types";

// Regex for wikilinks: [[target]] or [[target|display]] or ![[embed]]
const WIKILINK_REGEX = /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Parse wikilinks from markdown content
 */
export function parseWikilinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match;

  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    links.push({
      raw: match[0],
      isEmbed: match[1] === "!",
      target: match[2].trim(),
      display: match[3]?.trim(),
    });
  }

  return links;
}

/**
 * Convert wikilink target to URL path
 */
export function wikilinkToPath(target: string): string {
  // Remove .md extension if present
  const cleanTarget = target.replace(/\.md$/, "");
  // Encode each segment separately to preserve slashes
  const encodedPath = cleanTarget
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/note/${encodedPath}`;
}

/**
 * Replace wikilinks in content with placeholder markers
 * This is used before passing to react-markdown
 */
export function markWikilinks(content: string): string {
  return content.replace(WIKILINK_REGEX, (match, embed, target, display) => {
    const isEmbed = embed === "!";
    const text = display || target;
    const path = wikilinkToPath(target);

    if (isEmbed) {
      // For embeds, we'll handle them separately
      return `[EMBED:${target}]`;
    }

    // Return a special marker that we'll replace in the renderer
    return `[WIKILINK:${target}:${text}]`;
  });
}

/**
 * Check if a string contains wikilink markers
 */
export function containsWikilinkMarker(text: string): boolean {
  return text.includes("[WIKILINK:") || text.includes("[EMBED:");
}

/**
 * Parse a wikilink marker back to its components
 */
export function parseWikilinkMarker(
  marker: string
): { type: "link" | "embed"; target: string; display: string } | null {
  const linkMatch = marker.match(/\[WIKILINK:([^:]+):([^\]]+)\]/);
  if (linkMatch) {
    return {
      type: "link",
      target: linkMatch[1],
      display: linkMatch[2],
    };
  }

  const embedMatch = marker.match(/\[EMBED:([^\]]+)\]/);
  if (embedMatch) {
    return {
      type: "embed",
      target: embedMatch[1],
      display: embedMatch[1],
    };
  }

  return null;
}
