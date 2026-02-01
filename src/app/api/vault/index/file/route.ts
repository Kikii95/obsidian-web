import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { parseWikilinks } from "@/lib/wikilinks";
import { isPrivateContent } from "@/lib/privacy";
import matter from "gray-matter";
import {
  upsertVaultIndexEntry,
  deleteVaultIndexEntry,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

interface FileUpdateRequest {
  path: string;
  name: string;
  sha: string;
  content?: string;
  deleted?: boolean;
}

function parseInlineTags(content: string): string[] {
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");

  const tagRegex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_\-/]*)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(cleanContent)) !== null) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

export async function POST(request: Request) {
  try {
    const body: FileUpdateRequest = await request.json();
    const { path, name, sha, content, deleted } = body;

    if (!path) {
      return NextResponse.json(
        { error: "Chemin du fichier manquant" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const context = await getAuthenticatedContext();

    if (!context || !session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { vaultConfig } = context;

    const vaultKey: VaultKey = {
      userId: session.user.id || session.user.email || "",
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };

    // Handle deletion
    if (deleted) {
      await deleteVaultIndexEntry(vaultKey, path);
      return NextResponse.json({
        status: "deleted",
        path,
      });
    }

    // For updates, content is required
    if (!content) {
      return NextResponse.json(
        { error: "Contenu du fichier manquant" },
        { status: 400 }
      );
    }

    const privacyCheck = isPrivateContent(content);
    const { data: frontmatter } = matter(content);
    const wikilinks = parseWikilinks(content);

    // Parse tags
    const frontmatterTags: string[] = [];
    if (Array.isArray(frontmatter.tags)) {
      frontmatterTags.push(
        ...frontmatter.tags.map((t: string) => String(t).toLowerCase())
      );
    }
    if (typeof frontmatter.tags === "string") {
      frontmatterTags.push(
        ...frontmatter.tags.split(",").map((t: string) => t.trim().toLowerCase())
      );
    }
    const inlineTags = parseInlineTags(content);
    const allTags = [...new Set([...frontmatterTags, ...inlineTags])].filter(Boolean);

    await upsertVaultIndexEntry({
      ...vaultKey,
      filePath: path,
      fileName: name.replace(/\.md$/, ""),
      fileSha: sha,
      tags: allTags,
      wikilinks: wikilinks.map((w) => ({
        target: w.target,
        display: w.display,
        isEmbed: w.isEmbed,
      })),
      frontmatter: frontmatter as Record<string, unknown>,
      isPrivate: privacyCheck.isPrivate,
    });

    return NextResponse.json({
      status: "indexed",
      path,
      tagsCount: allTags.length,
      wikilinksCount: wikilinks.length,
      isPrivate: privacyCheck.isPrivate,
    });
  } catch (error) {
    console.error("Error updating file index:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'index" },
      { status: 500 }
    );
  }
}
