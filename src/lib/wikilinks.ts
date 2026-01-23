import type { WikiLink, VaultFile } from "@/types";

// Regex for wikilinks: [[target]] or [[target|display]] or ![[embed]]
const WIKILINK_REGEX = /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Map of note name (lowercase, without extension) -> full path
export type NoteLookupMap = Map<string, string>;

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

// File type detection patterns
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico|avif)$/i;
const PDF_EXTENSION = /\.pdf$/i;
const CANVAS_EXTENSION = /\.canvas$/i;
const MARKDOWN_EXTENSION = /\.md$/i;

/**
 * Build a lookup map from the vault tree
 * Maps note name (lowercase, no extension) -> full path (without extension)
 */
export function buildNoteLookupMap(tree: VaultFile[]): NoteLookupMap {
  const map: NoteLookupMap = new Map();

  function traverse(files: VaultFile[], parentPath: string = "") {
    for (const file of files) {
      const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;

      if (file.type === "dir" && file.children) {
        traverse(file.children, fullPath);
      } else if (file.type === "file") {
        // Get name without extension for lookup key
        const nameWithoutExt = file.name
          .replace(/\.(md|canvas|pdf|png|jpg|jpeg|gif|svg|webp|bmp|ico|avif)$/i, "");
        const pathWithoutExt = fullPath
          .replace(/\.(md|canvas|pdf|png|jpg|jpeg|gif|svg|webp|bmp|ico|avif)$/i, "");

        // Store with lowercase key for case-insensitive lookup
        // If multiple notes have the same name, prefer the one at shorter path (closer to root)
        const key = nameWithoutExt.toLowerCase();
        if (!map.has(key) || pathWithoutExt.length < (map.get(key)?.length ?? Infinity)) {
          map.set(key, pathWithoutExt);
        }
      }
    }
  }

  traverse(tree);
  return map;
}

/**
 * Detect the file type from a wikilink target
 */
function detectFileType(target: string): "note" | "canvas" | "file" {
  if (IMAGE_EXTENSIONS.test(target) || PDF_EXTENSION.test(target)) {
    return "file";
  }
  if (CANVAS_EXTENSION.test(target)) {
    return "canvas";
  }
  return "note";
}

/**
 * Convert wikilink target to URL path
 * @param target The wikilink target (e.g., "My Note" or "folder/My Note")
 * @param lookupMap Optional map to resolve note names to full paths
 */
export function wikilinkToPath(target: string, lookupMap?: NoteLookupMap): string {
  // Remove heading anchors first (like #🎯 Vue d'Ensemble)
  const withoutAnchor = target.replace(/#.*$/, "");

  // Clean backslashes
  const cleanTarget = withoutAnchor
    .replace(/\\+$/, "")        // Remove trailing backslashes
    .replace(/\\+/g, "");       // Remove any remaining backslashes

  // Skip empty paths
  if (!cleanTarget.trim()) {
    return "/";
  }

  // Detect file type based on extension
  const fileType = detectFileType(cleanTarget);

  // Remove extension for path building
  let pathWithoutExt = cleanTarget;
  if (MARKDOWN_EXTENSION.test(cleanTarget)) {
    pathWithoutExt = cleanTarget.replace(MARKDOWN_EXTENSION, "");
  } else if (CANVAS_EXTENSION.test(cleanTarget)) {
    pathWithoutExt = cleanTarget.replace(CANVAS_EXTENSION, "");
  } else if (PDF_EXTENSION.test(cleanTarget)) {
    pathWithoutExt = cleanTarget.replace(PDF_EXTENSION, "");
  } else if (IMAGE_EXTENSIONS.test(cleanTarget)) {
    pathWithoutExt = cleanTarget.replace(IMAGE_EXTENSIONS, "");
  }

  // If lookupMap is provided and target doesn't already have a path (no "/"),
  // try to resolve it to the full path
  if (lookupMap && !pathWithoutExt.includes("/")) {
    const lookupKey = pathWithoutExt.toLowerCase();
    const resolvedPath = lookupMap.get(lookupKey);
    if (resolvedPath) {
      pathWithoutExt = resolvedPath;
    }
  }

  // Encode each segment separately to preserve slashes
  const encodedPath = pathWithoutExt
    .split("/")
    .map((segment) => encodeURIComponent(segment.trim()))
    .filter(Boolean)  // Remove empty segments
    .join("/");

  // Return appropriate route based on file type
  switch (fileType) {
    case "canvas":
      return `/canvas/${encodedPath}`;
    case "file":
      return `/file/${encodedPath}`;
    default:
      return `/note/${encodedPath}`;
  }
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
