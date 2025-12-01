import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getFullVaultTree, getFileContent } from "@/lib/github";
import { filterPrivatePaths, isPrivateContent } from "@/lib/privacy";
import matter from "gray-matter";

interface TagInfo {
  name: string;
  count: number;
  notes: {
    path: string;
    name: string;
  }[];
}

interface TagsResponse {
  tags: TagInfo[];
  totalTags: number;
  totalNotes: number;
}

// Parse inline tags like #tag from content
function parseInlineTags(content: string): string[] {
  // Remove code blocks and inline code first
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");

  // Match #tag pattern (not in links or headers)
  const tagRegex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]*)/g;
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);

    // Get all markdown files
    const allFiles = await getFullVaultTree(octokit);
    const publicFiles = filterPrivatePaths(allFiles);
    const mdFiles = publicFiles.filter(
      (f) => f.type === "file" && f.path.endsWith(".md")
    );

    // Map to store tag info
    const tagsMap = new Map<string, TagInfo>();

    // Scan ALL markdown files (no cap - user triggers manually with warning)
    const filesToScan = mdFiles;

    for (const file of filesToScan) {
      try {
        const { content } = await getFileContent(octokit, file.path);

        // Check if content is private
        const privacyCheck = isPrivateContent(content);
        if (privacyCheck.isPrivate) continue;

        const noteName = file.name.replace(/\.md$/, "");
        const noteInfo = { path: file.path, name: noteName };

        // Parse frontmatter tags
        const { data: frontmatter } = matter(content);
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

        // Parse inline tags
        const inlineTags = parseInlineTags(content);

        // Merge all tags
        const allTags = [...new Set([...frontmatterTags, ...inlineTags])];

        // Update tags map
        for (const tag of allTags) {
          if (!tag) continue;

          if (tagsMap.has(tag)) {
            const tagInfo = tagsMap.get(tag)!;
            tagInfo.count++;
            tagInfo.notes.push(noteInfo);
          } else {
            tagsMap.set(tag, {
              name: tag,
              count: 1,
              notes: [noteInfo],
            });
          }
        }
      } catch {
        continue;
      }
    }

    // Convert to array and sort by count
    const tags = Array.from(tagsMap.values()).sort((a, b) => b.count - a.count);

    const response: TagsResponse = {
      tags,
      totalTags: tags.length,
      totalNotes: filesToScan.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des tags" },
      { status: 500 }
    );
  }
}
