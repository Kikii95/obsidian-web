import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getFullVaultTree, getFileContent } from "@/lib/github";
import { parseWikilinks } from "@/lib/wikilinks";
import { filterPrivatePaths, isPrivateContent } from "@/lib/privacy";

interface Backlink {
  path: string;
  name: string;
  context?: string; // Line containing the link (optional)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get("path");

    if (!targetPath) {
      return NextResponse.json(
        { error: "Le paramètre 'path' est requis" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);

    // Get the target note name (without extension and path)
    const targetName = targetPath
      .replace(/\.md$/, "")
      .split("/")
      .pop() || "";

    // Also keep full path without extension for exact matching
    const targetId = targetPath.replace(/\.md$/, "");

    // Get all markdown files
    const allFiles = await getFullVaultTree(octokit);
    const publicFiles = filterPrivatePaths(allFiles);
    const mdFiles = publicFiles.filter(
      (f) => f.type === "file" && f.path.endsWith(".md") && f.path !== targetPath
    );

    const backlinks: Backlink[] = [];

    // Limit files to scan for performance
    const filesToScan = mdFiles.slice(0, 150);

    for (const file of filesToScan) {
      try {
        const { content } = await getFileContent(octokit, file.path);

        // Check if content marks this file as private
        const privacyCheck = isPrivateContent(content);
        if (privacyCheck.isPrivate) continue;

        const wikilinks = parseWikilinks(content);

        // Check if any wikilink points to our target
        const hasBacklink = wikilinks.some((link) => {
          if (link.isEmbed) return false;

          const linkTarget = link.target;

          // Match by full path
          if (linkTarget === targetId) return true;

          // Match by name only (Obsidian style - just [[NoteName]])
          if (linkTarget === targetName) return true;

          // Match if link ends with target name
          if (linkTarget.endsWith("/" + targetName)) return true;

          return false;
        });

        if (hasBacklink) {
          // Find the line containing the link for context
          const lines = content.split("\n");
          const linkLine = lines.find((line) => {
            const lowerLine = line.toLowerCase();
            return (
              lowerLine.includes(`[[${targetName.toLowerCase()}]]`) ||
              lowerLine.includes(`[[${targetName.toLowerCase()}|`) ||
              lowerLine.includes(`[[${targetId.toLowerCase()}]]`) ||
              lowerLine.includes(`[[${targetId.toLowerCase()}|`)
            );
          });

          backlinks.push({
            path: file.path,
            name: file.name.replace(/\.md$/, ""),
            context: linkLine?.trim().slice(0, 200), // Limit context length
          });
        }
      } catch {
        // Skip files that can't be read
        continue;
      }
    }

    return NextResponse.json({
      backlinks,
      count: backlinks.length,
      scanned: filesToScan.length,
      total: mdFiles.length,
    });
  } catch (error) {
    console.error("Error finding backlinks:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche des backlinks" },
      { status: 500 }
    );
  }
}
