"use client";

import { memo } from "react";
import Link from "next/link";
import { FileText, Folder, Image, LayoutDashboard } from "lucide-react";
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
  const cleanPath = path.replace(/\\+/g, "").replace(/#.*$/, "");

  // Check for folder (ends with / or no extension)
  if (cleanPath.endsWith("/") || !cleanPath.includes(".")) {
    // If no dot in the last segment, likely a folder
    const lastSegment = cleanPath.split("/").pop() || "";
    if (!lastSegment.includes(".")) {
      return "folder";
    }
  }

  if (/\.canvas$/i.test(cleanPath)) return "canvas";
  if (/\.pdf$/i.test(cleanPath)) return "pdf";
  if (/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(cleanPath)) return "image";
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
  if (wikilinks.length === 0) return null;

  return (
    <div className="mt-12 pt-6 border-t border-border/50">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Liens dans cette note ({wikilinks.length})
      </h3>
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
  );
});
