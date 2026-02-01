"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TocItem {
  id: string;
  level: number;
  text: string;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

function parseToc(content: string): TocItem[] {
  const lines = content.split("\n");
  const toc: TocItem[] = [];

  for (const line of lines) {
    // Match markdown headings (# to ######)
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      // Skip if inside code block (simple heuristic)
      if (!text.startsWith("`")) {
        toc.push({
          id: generateId(text),
          level,
          text,
        });
      }
    }
  }

  return toc;
}

export function TableOfContents({ content, className }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toc = useMemo(() => parseToc(content), [content]);

  if (toc.length === 0) {
    return null;
  }

  const minLevel = Math.min(...toc.map((item) => item.level));

  const scrollToHeading = (id: string) => {
    // Try to find the heading in the document
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (const heading of headings) {
      const headingId = generateId(heading.textContent || "");
      if (headingId === id) {
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  };

  return (
    <div className={cn("border border-border/50 rounded-lg bg-muted/30", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <List className="h-4 w-4" />
        <span>Table des matières</span>
        <span className="ml-auto text-xs opacity-60">{toc.length} sections</span>
      </button>

      {isOpen && (
        <nav className="px-4 pb-3 max-h-[300px] overflow-y-auto">
          <ul className="space-y-1">
            {toc.map((item, index) => (
              <li
                key={index}
                style={{ paddingLeft: `${(item.level - minLevel) * 12}px` }}
              >
                <button
                  onClick={() => scrollToHeading(item.id)}
                  className="text-left text-sm text-muted-foreground hover:text-primary transition-colors truncate w-full py-0.5"
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
