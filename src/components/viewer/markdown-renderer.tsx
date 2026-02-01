"use client";

import { useState, useCallback, memo, useMemo, isValidElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { CollapsibleContent } from "@/components/viewer/collapsible-content";
import { Callout, parseCalloutSyntax } from "@/components/markdown/callout";
import { ImageZoomModal, useImageZoom } from "@/components/media/image-zoom-modal";
import { wikilinkToPath, buildNoteLookupMap, type NoteLookupMap } from "@/lib/wikilinks";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

// Code block wrapper with copy button and optional filename
function CodeBlockWrapper({
  children,
  code,
  filename,
}: {
  children: React.ReactNode;
  code: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [code]);

  return (
    <div className="relative group">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/70 border border-border/50 border-b-0 rounded-t-lg">
          <span className="text-xs font-mono text-muted-foreground">{filename}</span>
        </div>
      )}
      <button
        onClick={handleCopy}
        className={cn(
          "absolute p-1.5 rounded-md transition-all z-10",
          filename ? "top-10 right-2" : "top-2 right-2",
          "opacity-0 group-hover:opacity-100 focus:opacity-100",
          copied
            ? "bg-green-500/20 text-green-400"
            : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
        title={copied ? "Copié !" : "Copier le code"}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      {children}
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  currentPath?: string;
  isShareViewer?: boolean;
  /** Allow toggling checkboxes directly in reader mode */
  canToggleCheckbox?: boolean;
  /** Callback when a checkbox is toggled */
  onCheckboxToggle?: (taskText: string, newChecked: boolean) => void;
}

// Inner component that handles the actual rendering
function MarkdownRendererInner({
  content,
  className,
  currentPath,
  isShareViewer = false,
  canToggleCheckbox = false,
  onCheckboxToggle,
  lookupMap,
}: MarkdownRendererProps & { lookupMap: NoteLookupMap }) {
  // Image zoom modal state
  const imageZoom = useImageZoom();

  // Extract all image URLs from content for navigation
  const allImages = useMemo(() => {
    const imgRegex = /!\[.*?\]\((.*?)\)/g;
    const images: string[] = [];
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[1]);
    }
    return images;
  }, [content]);

  // Pre-process content to convert wikilinks to markdown links and handle collapsible syntax
  // In share viewer mode, wikilinks are displayed as plain text (no navigation)
  const processedContent = useMemo(() => {
    let processed = content;
    // Process code block titles first (```js title="file.js")
    processed = processCodeBlockTitles(processed);
    // Process callouts BEFORE markdown parsing
    processed = processCallouts(processed);
    // Process collapsible (hidden::visible) syntax
    processed = processCollapsible(processed);
    // Then process wikilinks
    processed = isShareViewer ? processWikilinksForShare(processed) : processWikilinks(processed, lookupMap);
    return processed;
  }, [content, isShareViewer, lookupMap]);

  return (
    <div className={cn("prose prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Custom link component to handle internal links with prefetching
          a: ({ href, children, ...props }) => {
            // Check if it's an internal wikilink - prefetch on hover
            if (href?.startsWith("/note/") || href?.startsWith("/canvas/") || href?.startsWith("/file/")) {
              return (
                <PrefetchLink
                  href={href}
                  className="wikilink text-primary hover:text-primary/80 no-underline hover:underline"
                  {...props}
                >
                  {children}
                </PrefetchLink>
              );
            }

            // External link
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/80 hover:text-primary"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Custom code block styling
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            const content = String(children).replace(/\n$/, "");

            // Check for Dataview blocks
            if (className?.includes("language-dataview")) {
              return (
                <div className="my-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M12 9v6" />
                    </svg>
                    Dataview Query
                  </div>
                  <code className="text-xs text-muted-foreground font-mono block whitespace-pre-wrap">
                    {content}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Les queries Dataview ne sont pas supportées en mode web.
                  </p>
                </div>
              );
            }

            // Check for Tasks blocks
            if (className?.includes("language-tasks")) {
              return (
                <div className="my-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Tasks Query
                  </div>
                  <code className="text-xs text-muted-foreground font-mono block whitespace-pre-wrap">
                    {content}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Les queries Tasks ne sont pas supportées en mode web.
                  </p>
                </div>
              );
            }

            if (isInline) {
              return (
                <code
                  className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary/90"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={cn("text-sm", className)} {...props}>
                {children}
              </code>
            );
          },
          // Custom pre for code blocks with copy button and filename support
          pre: ({ children, node, ...props }) => {
            // Check if this contains a dataview/tasks block by looking at children
            const codeElement = node?.children?.[0];
            const codeClassName = (codeElement as { properties?: { className?: string[] } })?.properties?.className || [];
            const classStr = Array.isArray(codeClassName) ? codeClassName.join(" ") : "";

            // Skip wrapper for dataview/tasks (they render their own container)
            if (classStr.includes("language-dataview") || classStr.includes("language-tasks")) {
              return <>{children}</>;
            }

            // Extract text content for copy functionality
            const extractText = (node: unknown): string => {
              if (!node) return "";
              if (typeof node === "string") return node;
              if (Array.isArray(node)) return node.map(extractText).join("");
              if (typeof node === "object" && node !== null) {
                const n = node as { children?: unknown; value?: string };
                if ("value" in n) return n.value || "";
                if ("children" in n) return extractText(n.children);
              }
              return "";
            };
            let codeText = extractText(codeElement).replace(/\n$/, "");

            // Extract filename from comment marker if present
            let filename: string | undefined;
            const filenameMatch = codeText.match(/^<!-- codeblock-title:(.+?) -->\n?/);
            if (filenameMatch) {
              filename = filenameMatch[1];
              codeText = codeText.replace(filenameMatch[0], "");
            }

            return (
              <CodeBlockWrapper code={codeText} filename={filename}>
                <pre
                  className={cn(
                    "bg-muted/50 border border-border/50 p-4 pr-12 overflow-x-auto",
                    filename ? "rounded-b-lg rounded-t-none border-t-0" : "rounded-lg"
                  )}
                  {...props}
                >
                  {children}
                </pre>
              </CodeBlockWrapper>
            );
          },
          // Custom headings with anchor links
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground border-b border-border/30 pb-2" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground" {...props}>
              {children}
            </h3>
          ),
          // Custom blockquote with callout support
          blockquote: ({ children, node, ...props }) => {
            // Extract text content to check for callout syntax
            const extractFirstLine = (n: unknown): string => {
              if (!n) return "";
              if (typeof n === "string") return n.split("\n")[0];
              if (Array.isArray(n)) {
                for (const child of n) {
                  const result = extractFirstLine(child);
                  if (result) return result;
                }
              }
              if (typeof n === "object" && n !== null) {
                const obj = n as { children?: unknown; value?: string; props?: { children?: unknown } };
                if (obj.value) return obj.value.split("\n")[0];
                if (obj.children) return extractFirstLine(obj.children);
                if (obj.props?.children) return extractFirstLine(obj.props.children);
              }
              return "";
            };

            const firstLine = extractFirstLine(children);
            const calloutInfo = parseCalloutSyntax(firstLine.trim());

            if (calloutInfo.isCallout) {
              // Remove the callout syntax line from children
              const removeFirstLine = (nodes: React.ReactNode): React.ReactNode => {
                if (!nodes) return nodes;
                if (Array.isArray(nodes)) {
                  return nodes.map((node, i) => {
                    if (i === 0) return removeFirstLine(node);
                    return node;
                  });
                }
                if (isValidElement(nodes)) {
                  const nodeProps = nodes.props as { children?: React.ReactNode };
                  if (typeof nodeProps.children === "string") {
                    const lines = nodeProps.children.split("\n");
                    if (lines[0].match(/^\[!\w+\]/)) {
                      const remaining = lines.slice(1).join("\n");
                      return { ...nodes, props: { ...nodeProps, children: remaining } };
                    }
                  }
                }
                return nodes;
              };

              return (
                <Callout
                  type={calloutInfo.type!}
                  title={calloutInfo.title}
                  foldable={calloutInfo.foldable}
                  defaultFolded={calloutInfo.defaultFolded}
                >
                  {removeFirstLine(children)}
                </Callout>
              );
            }

            // Regular blockquote
            return (
              <blockquote
                className="border-l-4 border-primary/50 pl-4 py-1 my-4 italic text-muted-foreground bg-muted/20 rounded-r"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          // Custom table
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border border-border/50 bg-muted/30 px-4 py-2 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border/50 px-4 py-2" {...props}>
              {children}
            </td>
          ),
          // Custom unordered list
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-6 my-3 space-y-1 text-foreground/90" {...props}>
              {children}
            </ul>
          ),
          // Custom ordered list
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 my-3 space-y-1 text-foreground/90" {...props}>
              {children}
            </ol>
          ),
          // Custom input for task checkboxes (generated by remark-gfm)
          input: ({ type, checked, disabled, ...props }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!canToggleCheckbox}
                  className={cn(
                    "mr-2 accent-primary",
                    canToggleCheckbox && "cursor-pointer"
                  )}
                  style={{ verticalAlign: "middle" }}
                  {...props}
                />
              );
            }
            return <input type={type} checked={checked} disabled={disabled} {...props} />;
          },
          // Custom list items for tasks
          li: ({ children, className, node, ...props }) => {
            // Check if this is a task list item (remark-gfm adds "task-list-item" class)
            const isTaskItem = className?.includes("task-list-item");

            if (isTaskItem && canToggleCheckbox && onCheckboxToggle) {
              // Extract text content for the toggle callback
              const extractText = (n: ReactNode): string => {
                if (typeof n === "string") return n;
                if (typeof n === "number") return String(n);
                if (Array.isArray(n)) return n.map(extractText).join("");
                if (isValidElement(n)) {
                  // Skip the checkbox input itself
                  if ((n.props as { type?: string })?.type === "checkbox") return "";
                  const nodeProps = n.props as { children?: ReactNode };
                  if (nodeProps.children) {
                    return extractText(nodeProps.children);
                  }
                }
                return "";
              };

              const taskText = extractText(children).trim();

              // Find if checkbox is checked by looking at node properties
              const inputNode = (node?.children as Array<{ tagName?: string; properties?: { checked?: boolean } }>)?.find(
                (child) => child.tagName === "input"
              );
              const isChecked = inputNode?.properties?.checked ?? false;

              const handleToggle = () => {
                onCheckboxToggle(taskText, !isChecked);
              };

              return (
                <li
                  className={cn("list-none", className)}
                  onClick={handleToggle}
                  style={{ cursor: "pointer" }}
                  {...props}
                >
                  {children}
                </li>
              );
            }

            // Regular list item
            return (
              <li className={cn("text-foreground/90", className)} {...props}>
                {children}
              </li>
            );
          },
          // Custom horizontal rule
          hr: ({ ...props }) => (
            <hr className="my-8 border-border/50" {...props} />
          ),
          // Custom image with zoom on click
          img: ({ src, alt, ...props }) => {
            const srcString = typeof src === "string" ? src : undefined;
            return (
              <img
                src={srcString}
                alt={alt || ""}
                className="cursor-zoom-in rounded-lg max-w-full hover:shadow-lg transition-shadow"
                onClick={() => srcString && imageZoom.openImage(srcString, allImages)}
                {...props}
              />
            );
          },
          // Custom paragraph
          p: ({ children, ...props }) => (
            <p className="my-3 leading-relaxed text-foreground/90" {...props}>
              {children}
            </p>
          ),
          // Custom span for collapsible content (hidden::visible) syntax
          span: ({ className, node, ...props }) => {
            // Check if this is a collapsible toggle span
            if (className === "collapsible-toggle") {
              const hidden = (node?.properties?.dataHidden as string) || "";
              const visible = (node?.properties?.dataVisible as string) || "";
              return <CollapsibleContent hidden={hidden} visible={visible} />;
            }
            // Regular span
            return <span className={className} {...props} />;
          },
          // Custom div for callouts (processed by processCallouts)
          div: ({ className, node, children, ...props }) => {
            // Check if this is a callout div
            if (className === "obsidian-callout") {
              const type = (node?.properties?.dataType as string) || "note";
              const title = (node?.properties?.dataTitle as string) || "";
              const foldable = (node?.properties?.dataFoldable as string) === "true";
              const defaultFolded = (node?.properties?.dataFolded as string) === "true";

              // The content is HTML-escaped text, we need to unescape and render
              const extractText = (n: unknown): string => {
                if (!n) return "";
                if (typeof n === "string") return n;
                if (Array.isArray(n)) return n.map(extractText).join("");
                if (typeof n === "object" && n !== null) {
                  const obj = n as { value?: string; children?: unknown };
                  if (obj.value) return obj.value;
                  if (obj.children) return extractText(obj.children);
                }
                return "";
              };

              const rawContent = extractText(children);
              // Unescape HTML entities
              const unescapedContent = rawContent
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, "&");

              return (
                <Callout
                  type={type as "note" | "warning" | "tip" | "info" | "danger" | "example" | "quote" | "abstract" | "bug" | "success" | "question" | "failure"}
                  title={title}
                  foldable={foldable}
                  defaultFolded={defaultFolded}
                >
                  {/* Render content as markdown for proper formatting */}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  >
                    {unescapedContent}
                  </ReactMarkdown>
                </Callout>
              );
            }
            // Regular div
            return <div className={className} {...props}>{children}</div>;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        src={imageZoom.selectedImage}
        images={imageZoom.images}
        open={imageZoom.isOpen}
        onOpenChange={imageZoom.setIsOpen}
      />
    </div>
  );
}

// Memoized inner component
const MemoizedMarkdownRendererInner = memo(MarkdownRendererInner);

// Outer component that builds lookupMap and passes it as prop
// This ensures re-render when tree changes
export function MarkdownRenderer({
  content,
  className,
  currentPath,
  isShareViewer = false,
  canToggleCheckbox = false,
  onCheckboxToggle,
}: MarkdownRendererProps) {
  // Get vault tree for wikilink resolution
  const { tree } = useVaultStore();

  // Build lookup map for resolving wikilinks to full paths
  const lookupMap = useMemo(() => buildNoteLookupMap(tree), [tree]);

  return (
    <MemoizedMarkdownRendererInner
      content={content}
      className={className}
      currentPath={currentPath}
      isShareViewer={isShareViewer}
      canToggleCheckbox={canToggleCheckbox}
      onCheckboxToggle={onCheckboxToggle}
      lookupMap={lookupMap}
    />
  );
}

/**
 * Process code blocks with title="filename" syntax
 * Converts ```js title="file.js" to include a comment marker for the pre component
 */
function processCodeBlockTitles(content: string): string {
  // Match code blocks with title attribute: ```lang title="filename"
  // Supports: ```js title="file.js", ```typescript title='app.ts', etc.
  const codeBlockRegex = /```(\w*)\s+title=["']([^"']+)["']\s*\n/g;

  return content.replace(codeBlockRegex, (match, lang, title) => {
    // Insert a comment at the start of the code block that we can detect in pre
    return `\`\`\`${lang}\n<!-- codeblock-title:${title} -->\n`;
  });
}

/**
 * Convert (hidden::visible) syntax to HTML spans for collapsible content
 * @param content The markdown content
 */
function processCollapsible(content: string): string {
  // Match (hidden::visible) syntax - non-greedy to handle multiple on same line
  // Supports multiline hidden content with [\s\S] instead of .
  const collapsibleRegex = /\(([^:)]+?)::([^)]+?)\)/g;

  return content.replace(collapsibleRegex, (match, hidden, visible) => {
    // Escape HTML entities to prevent XSS and rendering issues
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    return `<span class="collapsible-toggle" data-hidden="${escapeHtml(hidden.trim())}" data-visible="${escapeHtml(visible.trim())}"></span>`;
  });
}

/**
 * Convert Obsidian wikilinks to standard markdown links
 * @param content The markdown content
 * @param lookupMap Optional map to resolve note names to full paths
 */
function processWikilinks(content: string, lookupMap?: NoteLookupMap): string {
  // Match [[target]] or [[target|display]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  return content.replace(wikilinkRegex, (match, target, display) => {
    const text = display || target;
    const path = wikilinkToPath(target, lookupMap);
    return `[${text}](${path})`;
  });
}

/**
 * Convert Obsidian wikilinks to styled text (no links) for share viewer
 */
function processWikilinksForShare(content: string): string {
  // Match [[target]] or [[target|display]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  return content.replace(wikilinkRegex, (match, target, display) => {
    const text = display || target;
    // Return as styled text, not a link
    return `**${text}**`;
  });
}

/**
 * Process Obsidian callout syntax and convert to HTML before markdown parsing
 * Syntax: > [!type] optional title
 *         > content...
 * Supports: +/- for fold state (e.g., [!note]+ or [!note]-)
 */
function processCallouts(content: string): string {
  // Split content by lines to process blockquotes
  const lines = content.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this is the start of a callout: > [!type]
    const calloutStartMatch = line.match(/^>\s*\[!(\w+)\]([-+])?\s*(.*)?$/);

    if (calloutStartMatch) {
      const type = calloutStartMatch[1].toLowerCase();
      const foldState = calloutStartMatch[2]; // + or - or undefined
      const title = calloutStartMatch[3]?.trim() || "";

      // Determine fold attributes
      const foldable = foldState === "+" || foldState === "-";
      const defaultFolded = foldState === "-";

      // Collect all content lines of this callout
      const contentLines: string[] = [];
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        // Continue if line starts with > (part of blockquote)
        if (nextLine.match(/^>/)) {
          // Remove the > prefix and add to content
          contentLines.push(nextLine.replace(/^>\s?/, ""));
          i++;
        } else if (nextLine.trim() === "") {
          // Empty line might be part of callout or end it
          // Check if next non-empty line continues the blockquote
          if (i + 1 < lines.length && lines[i + 1].match(/^>/)) {
            contentLines.push("");
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Build callout HTML
      const calloutContent = contentLines.join("\n");
      const escapedTitle = title.replace(/"/g, "&quot;");
      const escapedContent = calloutContent
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Use a custom HTML element that will be handled by rehype-raw
      result.push(
        `<div class="obsidian-callout" data-type="${type}" data-title="${escapedTitle}" data-foldable="${foldable}" data-folded="${defaultFolded}">${escapedContent}</div>`
      );
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
}
