import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import {
  getPublicVaultIndexEntries,
  getVaultIndexStatus,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

interface Backlink {
  path: string;
  name: string;
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

    // Check if index is available
    const indexStatus = await getVaultIndexStatus(vaultKey);

    if (!indexStatus || indexStatus.status !== "completed") {
      return NextResponse.json({
        backlinks: [],
        count: 0,
        fromIndex: false,
        needsIndex: true,
        message: "Index non disponible. Lancez l'indexation depuis les paramètres.",
      });
    }

    // Normalize target path
    const normalizedPath = targetPath.endsWith(".md")
      ? targetPath
      : `${targetPath}.md`;

    // Get the target note name (without extension and path)
    const targetName = normalizedPath
      .replace(/\.md$/, "")
      .split("/")
      .pop() || "";

    // Full path without extension for exact matching
    const targetId = normalizedPath.replace(/\.md$/, "");

    // Lowercase versions for case-insensitive matching
    const targetNameLower = targetName.toLowerCase();
    const targetIdLower = targetId.toLowerCase();

    // Get all indexed entries (public only)
    const entries = await getPublicVaultIndexEntries(vaultKey);

    const backlinks: Backlink[] = [];

    for (const entry of entries) {
      // Skip the target file itself
      if (entry.filePath === normalizedPath) continue;

      const wikilinks = entry.wikilinks as { target: string; display?: string; isEmbed: boolean }[];

      for (const link of wikilinks) {
        const linkTargetLower = link.target.toLowerCase();

        // Clean the link target (remove anchors, extensions)
        const cleanTarget = linkTargetLower
          .replace(/\.md$/i, "")
          .replace(/#.*$/, "")
          .replace(/\\+/g, "");

        let isBacklink = false;

        // Multiple matching strategies:
        // 1. Exact match by full path
        if (cleanTarget === targetIdLower) {
          isBacklink = true;
        }
        // 2. Match by name only (Obsidian style - just [[NoteName]])
        else if (cleanTarget === targetNameLower) {
          isBacklink = true;
        }
        // 3. Match if link ends with /targetName
        else if (cleanTarget.endsWith("/" + targetNameLower)) {
          isBacklink = true;
        }
        // 4. Match if target ends with /linkTarget (partial path match)
        else if (targetIdLower.endsWith("/" + cleanTarget)) {
          isBacklink = true;
        }
        // 5. Match just the filename part
        else if (cleanTarget.split("/").pop() === targetNameLower) {
          isBacklink = true;
        }

        if (isBacklink) {
          backlinks.push({
            path: entry.filePath,
            name: entry.fileName,
          });
          break; // Found a backlink from this file, no need to check more links
        }
      }
    }

    return NextResponse.json({
      backlinks,
      count: backlinks.length,
      scanned: entries.length,
      total: entries.length,
      fromIndex: true,
    });
  } catch (error) {
    console.error("Error finding backlinks:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche des backlinks" },
      { status: 500 }
    );
  }
}
