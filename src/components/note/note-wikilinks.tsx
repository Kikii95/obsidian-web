"use client";

import { memo } from "react";
import Link from "next/link";
import { encodePathSegments } from "@/lib/path-utils";

interface NoteWikilinksProps {
  wikilinks: string[];
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
          return (
            <Link
              key={link}
              href={`/note/${encodedLink}`}
              className="text-sm text-primary hover:text-primary/80 hover:underline"
            >
              [[{link}]]
            </Link>
          );
        })}
      </div>
    </div>
  );
});
