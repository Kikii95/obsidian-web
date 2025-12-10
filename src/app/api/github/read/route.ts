import { NextRequest, NextResponse } from "next/server";
import { getFileContent, getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { isNoteLocked } from "@/lib/lock-store";
import matter from "gray-matter";

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path requis" }, { status: 400 });
    }

    const { octokit, vaultConfig } = context;
    const { content, sha } = await getFileContent(octokit, path, vaultConfig);

    // Parse frontmatter
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Extract wikilinks from content
    const wikilinks = extractWikilinks(markdownContent);

    // Check if note is locked (path OR frontmatter)
    const isLocked = isNoteLocked(path, frontmatter);

    return NextResponse.json({
      path,
      content: markdownContent,
      rawContent: content,
      sha,
      frontmatter,
      wikilinks,
      isLocked,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture du fichier" },
      { status: 500 }
    );
  }
}

function extractWikilinks(content: string): string[] {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return [...new Set(links)];
}
