import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkStringify from "remark-stringify";

// Regex for Obsidian custom syntax
const WIKILINK_REGEX = /(!?\[\[[^\]]+\]\])/g;
const COLLAPSIBLE_REGEX = /\(([^:)]+?)::([^)]+?)\)/g;

interface FormatterOptions {
  bullet?: "-" | "*" | "+";
  emphasis?: "_" | "*";
  strong?: "*" | "_";
  listItemIndent?: "one" | "tab" | "mixed";
}

/**
 * Format markdown content while preserving Obsidian-specific syntax
 * (wikilinks [[Note]], collapsibles (hidden::visible))
 */
export async function formatMarkdown(
  content: string,
  options: FormatterOptions = {}
): Promise<string> {
  // 1. Extract and replace custom syntax with placeholders
  const wikilinks: string[] = [];
  const collapsibles: string[] = [];

  let processed = content.replace(WIKILINK_REGEX, (match) => {
    wikilinks.push(match);
    return `__WIKILINK_${wikilinks.length - 1}__`;
  });

  processed = processed.replace(COLLAPSIBLE_REGEX, (match) => {
    collapsibles.push(match);
    return `__COLLAPSIBLE_${collapsibles.length - 1}__`;
  });

  // 2. Format with remark
  // Note: Type cast needed due to remark-stringify type definitions mismatch
  const stringifyOptions = {
    bullet: options.bullet ?? "-",
    emphasis: options.emphasis ?? "_",
    strong: options.strong ?? "*",
    listItemIndent: options.listItemIndent ?? "one",
    fences: true,
    incrementListMarker: true,
    rule: "-",
    ruleSpaces: false,
  } as Parameters<typeof remarkStringify>[0];

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkStringify, stringifyOptions)
    .process(processed);

  let formatted = String(result);

  // 3. Restore custom syntax
  wikilinks.forEach((link, i) => {
    formatted = formatted.replace(`__WIKILINK_${i}__`, link);
  });

  collapsibles.forEach((col, i) => {
    formatted = formatted.replace(`__COLLAPSIBLE_${i}__`, col);
  });

  return formatted;
}
