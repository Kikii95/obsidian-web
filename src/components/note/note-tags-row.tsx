"use client";

import { cavalierIndex } from "@/lib/da/cavalier";

interface NoteTagsRowProps {
  status?: unknown;
  tags?: unknown;
}

/** Statut (tampon) et étiquettes (cavaliers) tirés du frontmatter, en tête de fiche. */
export function NoteTagsRow({ status, tags }: NoteTagsRowProps) {
  const tagList = Array.isArray(tags) ? tags.map(String) : [];
  if (!status && tagList.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {status ? <span className="tampon">{String(status)}</span> : null}
      {tagList.map((tag) => (
        <span key={tag} className="cavalier" data-c={cavalierIndex(tag)}>
          #{tag}
        </span>
      ))}
    </div>
  );
}
