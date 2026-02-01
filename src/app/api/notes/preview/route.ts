import { NextRequest, NextResponse } from "next/server";
import { getFileContent } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import matter from "gray-matter";

const MAX_PREVIEW_LENGTH = 500;

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    const { octokit, vaultConfig } = context;

    try {
      const { content } = await getFileContent(octokit, path, vaultConfig);

      const { data: frontmatter, content: markdownContent } = matter(content);

      const title = frontmatter.title || path.split("/").pop()?.replace(".md", "") || "Note";

      const cleanContent = markdownContent
        .replace(/^---[\s\S]*?---\s*/m, "")
        .replace(/^#+\s+.*/gm, "")
        .replace(/!\[.*?\]\(.*?\)/g, "[image]")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, link, alias) => alias || link)
        .replace(/```[\s\S]*?```/g, "[code]")
        .replace(/`[^`]+`/g, "")
        .replace(/[*_~]+/g, "")
        .replace(/>\s+/g, "")
        .replace(/\n{2,}/g, "\n\n")
        .trim();

      const preview = cleanContent.substring(0, MAX_PREVIEW_LENGTH);

      return NextResponse.json({
        title,
        content: preview,
        path,
      });
    } catch (error) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
}
