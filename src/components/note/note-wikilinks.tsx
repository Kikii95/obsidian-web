"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { FileText, Folder, Image, LayoutDashboard, ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { encodePathSegments } from "@/lib/path-utils";

interface NoteWikilinksProps {
  wikilinks: string[];
}

// Format path for display (remove extensions, backslashes, anchors)
function formatPath(path: string): string {
  return path
    .replace(/\.(md|canvas|pdf|png|jpg|jpeg|gif|svg|webp)$/i, "")
    .replace(/\\+/g, "")
    .replace(/#.*$/, "")
    .replace(/\/+$/, "");
}

// Detect link type from path
type LinkType = "note" | "folder" | "canvas" | "image" | "pdf";

function detectLinkType(path: string): LinkType {
  const cleanPath = path.replace(/\\+/g, "").replace(/#.*$/, "").trim();

  // Explicit folder: ends with /
  if (cleanPath.endsWith("/")) {
    return "folder";
  }

  // Check for known extensions
  if (/\.canvas$/i.test(cleanPath)) return "canvas";
  if (/\.pdf$/i.test(cleanPath)) return "pdf";
  if (/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(cleanPath)) return "image";

  // Default: it's a note (even without .md extension - Obsidian style)
  return "note";
}

// Get icon component for link type
function LinkIcon({ type }: { type: LinkType }) {
  switch (type) {
    case "folder":
      return <Folder className="h-3.5 w-3.5 shrink-0" />;
    case "canvas":
      return <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />;
    case "image":
      return <Image className="h-3.5 w-3.5 shrink-0" />;
    case "pdf":
      return <FileText className="h-3.5 w-3.5 shrink-0 text-red-400" />;
    default:
      return <FileText className="h-3.5 w-3.5 shrink-0" />;
  }
}

// Get href based on link type
function getHref(link: string, type: LinkType): string {
  const cleanPath = link
    .replace(/\.(md|canvas|pdf|png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "")
    .replace(/\\+/g, "")
    .replace(/#.*$/, "")
    .replace(/\/+$/, "");

  const encodedPath = encodePathSegments(cleanPath);

  switch (type) {
    case "folder":
      return `/folder/${encodedPath}`;
    case "canvas":
      return `/canvas/${encodedPath}`;
    case "image":
    case "pdf":
      return `/file/${encodedPath}`;
    default:
      return `/note/${encodedPath}`;
  }
}

export const NoteWikilinks = memo(function NoteWikilinks({
  wikilinks,
}: NoteWikilinksProps) {
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default

  if (wikilinks.length === 0) return null;

  return (
    <div className="mt-8 border border-border/50 rounded-lg overflow-hidden bg-card/50">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span>Liens dans cette note</span>
          <span className="text-muted-foreground font-normal">
            ({wikilinks.length})
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <div className="flex flex-wrap gap-2">
            {wikilinks.map((link) => {
              const displayPath = formatPath(link);
              const linkType = detectLinkType(link);
              const href = getHref(link, linkType);

              // Use regular Link for non-note types (no prefetch)
              const LinkComponent = linkType === "note" ? PrefetchLink : Link;

              return (
                <LinkComponent
                  key={link}
                  href={href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <LinkIcon type={linkType} />
                  {displayPath}
                </LinkComponent>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
