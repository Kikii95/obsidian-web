import { NextResponse } from "next/server";
import { getFullVaultTree, getFileContent } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { filterPrivatePaths, isPrivateContent } from "@/lib/privacy";

interface Backlink {
  path: string;
  name: string;
  context?: string;
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

    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;

    // Normalize target path - ensure .md extension
    const normalizedPath = targetPath.endsWith(".md")
      ? targetPath
      : `${targetPath}.md`;

    // Get the target note name (without extension and path)
    const targetName = normalizedPath
      .replace(/\.md$/, "")
      .split("/")
      .pop() || "";

    // Also keep full path without extension for exact matching
    const targetId = normalizedPath.replace(/\.md$/, "");

    // Create lowercase versions for case-insensitive matching
    const targetNameLower = targetName.toLowerCase();
    const targetIdLower = targetId.toLowerCase();

    // Get all markdown files
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);
    const publicFiles = filterPrivatePaths(allFiles);
    const mdFiles = publicFiles.filter(
      (f) => f.type === "file" && f.path.endsWith(".md") && f.path !== normalizedPath
    );

    const backlinks: Backlink[] = [];

    // Scan ALL markdown files in the vault
    const filesToScan = mdFiles;

    // Regex to find all wikilinks in content
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

    for (const file of filesToScan) {
      try {
        const { content } = await getFileContent(octokit, file.path, vaultConfig);

        // Check if content marks this file as private
        const privacyCheck = isPrivateContent(content);
        if (privacyCheck.isPrivate) continue;

        // Find all wikilinks in content
        const matches = content.matchAll(wikilinkRegex);
        let hasBacklink = false;
        let matchedLine: string | undefined;

        for (const match of matches) {
          const linkTarget = match[1].trim();
          const linkTargetLower = linkTarget.toLowerCase();

          // Clean the link target (remove anchors, extensions)
          const cleanTarget = linkTargetLower
            .replace(/\.md$/i, "")
            .replace(/#.*$/, "")
            .replace(/\\+/g, "");

          // Multiple matching strategies:
          // 1. Exact match by full path
          if (cleanTarget === targetIdLower) {
            hasBacklink = true;
          }
          // 2. Match by name only (Obsidian style - just [[NoteName]])
          else if (cleanTarget === targetNameLower) {
            hasBacklink = true;
          }
          // 3. Match if link ends with /targetName
          else if (cleanTarget.endsWith("/" + targetNameLower)) {
            hasBacklink = true;
          }
          // 4. Match if target ends with /linkTarget (partial path match)
          else if (targetIdLower.endsWith("/" + cleanTarget)) {
            hasBacklink = true;
          }
          // 5. Match just the filename part
          else if (cleanTarget.split("/").pop() === targetNameLower) {
            hasBacklink = true;
          }

          if (hasBacklink) {
            // Get the line containing this match for context
            const lineStart = content.lastIndexOf("\n", match.index) + 1;
            const lineEnd = content.indexOf("\n", match.index);
            matchedLine = content.substring(
              lineStart,
              lineEnd === -1 ? undefined : lineEnd
            ).trim();
            break;
          }
        }

        if (hasBacklink) {
          backlinks.push({
            path: file.path,
            name: file.name.replace(/\.md$/, ""),
            context: matchedLine?.slice(0, 200),
          });
        }
      } catch {
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
