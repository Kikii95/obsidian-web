"use client";

import { memo } from "react";
import { FileText } from "lucide-react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { encodePathSegments } from "@/lib/path-utils";

interface NoteWikilinksProps {
  wikilinks: string[];
}

// Format path for display (remove .md extension, backslashes, anchors)
function formatPath(path: string): string {
  return path
    .replace(/\.md$/, "")
    .replace(/\\+/g, "")        // Remove backslashes
    .replace(/#.*$/, "")        // Remove heading anchors
    .replace(/\/+$/, "");       // Remove trailing slashes
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
          const encodedLink = encodePathSegments(link);
          const displayPath = formatPath(link);
          return (
            <PrefetchLink
              key={link}
              href={`/note/${encodedLink}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {displayPath}
            </PrefetchLink>
          );
        })}
      </div>
    </div>
  );
});
