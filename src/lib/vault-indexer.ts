import matter from "gray-matter";
import type { Octokit } from "@octokit/rest";
import { getFileContent, type VaultConfig } from "@/lib/github";
import { parseWikilinks } from "@/lib/wikilinks";
import { isPrivateContent } from "@/lib/privacy";
import { upsertVaultIndexEntry, type VaultKey } from "@/lib/db/vault-index-queries";

export interface IndexableFile {
  path: string;
  name: string;
  sha: string;
}

/** Inline `#tag` extraction, ignoring code blocks and inline code. */
export function parseInlineTags(content: string): string[] {
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");

  const tagRegex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_\-/]*)/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(cleanContent)) !== null) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

/** Merge frontmatter tags (array or comma string) with inline tags. */
function extractTags(frontmatter: Record<string, unknown>, content: string): string[] {
  const tags: string[] = [];
  const fmTags = frontmatter.tags;
  if (Array.isArray(fmTags)) {
    tags.push(...fmTags.map((t) => String(t).toLowerCase()));
  } else if (typeof fmTags === "string") {
    tags.push(...fmTags.split(",").map((t) => t.trim().toLowerCase()));
  }
  return [...new Set([...tags, ...parseInlineTags(content)])].filter(Boolean);
}

/**
 * Fetch a note's content, parse it, and upsert it into the vault index.
 * Throws on fetch/parse errors so the caller can retry or count the failure.
 */
export async function indexNoteFile(
  octokit: Octokit,
  vaultConfig: Partial<VaultConfig>,
  vaultKey: VaultKey,
  file: IndexableFile
): Promise<void> {
  const { content } = await getFileContent(octokit, file.path, vaultConfig);
  const privacyCheck = isPrivateContent(content);
  const { data: frontmatter } = matter(content);
  const wikilinks = parseWikilinks(content);

  await upsertVaultIndexEntry({
    ...vaultKey,
    filePath: file.path,
    fileName: file.name.replace(/\.md$/, ""),
    fileSha: file.sha,
    tags: extractTags(frontmatter as Record<string, unknown>, content),
    wikilinks: wikilinks.map((w) => ({
      target: w.target,
      display: w.display,
      isEmbed: w.isEmbed,
    })),
    frontmatter: frontmatter as Record<string, unknown>,
    isPrivate: privacyCheck.isPrivate,
  });
}
