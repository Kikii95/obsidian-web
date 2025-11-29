"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import Link from "next/link";
import { wikilinkToPath } from "@/lib/wikilinks";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

// Code block wrapper with copy button
function CodeBlockWrapper({ children, code }: { children: React.ReactNode; code: string }) {
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
      <button
        onClick={handleCopy}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-md transition-all z-10",
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
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Pre-process content to convert wikilinks to markdown links
  const processedContent = processWikilinks(content);

  return (
    <div className={cn("prose prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Custom link component to handle internal links
          a: ({ href, children, ...props }) => {
            // Check if it's an internal wikilink
            if (href?.startsWith("/note/")) {
              return (
                <Link
                  href={href}
                  className="wikilink text-primary hover:text-primary/80 no-underline hover:underline"
                  {...props}
                >
                  {children}
                </Link>
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
          // Custom pre for code blocks with copy button
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
            const codeText = extractText(codeElement).replace(/\n$/, "");

            return (
              <CodeBlockWrapper code={codeText}>
                <pre
                  className="bg-muted/50 border border-border/50 rounded-lg p-4 pr-12 overflow-x-auto"
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
          // Custom blockquote
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/50 pl-4 py-1 my-4 italic text-muted-foreground bg-muted/20 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
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
          // Custom list items for tasks
          li: ({ children, className, ...props }) => {
            const content = String(children);

            // Check for task list items
            if (content.startsWith("[ ] ") || content.startsWith("[x] ")) {
              const isChecked = content.startsWith("[x] ");
              const text = content.slice(4);

              return (
                <li className="flex items-start gap-2 list-none" {...props}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="mt-1 accent-primary"
                  />
                  <span className={isChecked ? "line-through text-muted-foreground" : ""}>
                    {text}
                  </span>
                </li>
              );
            }

            return (
              <li className="text-foreground/90" {...props}>
                {children}
              </li>
            );
          },
          // Custom horizontal rule
          hr: ({ ...props }) => (
            <hr className="my-8 border-border/50" {...props} />
          ),
          // Custom paragraph
          p: ({ children, ...props }) => (
            <p className="my-3 leading-relaxed text-foreground/90" {...props}>
              {children}
            </p>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Convert Obsidian wikilinks to standard markdown links
 */
function processWikilinks(content: string): string {
  // Match [[target]] or [[target|display]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  return content.replace(wikilinkRegex, (match, target, display) => {
    const text = display || target;
    const path = wikilinkToPath(target);
    return `[${text}](${path})`;
  });
}
