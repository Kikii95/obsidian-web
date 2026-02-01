import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { getFileContent } from "@/lib/github";
import { parseWikilinks } from "@/lib/wikilinks";
import { isPrivateContent } from "@/lib/privacy";
import matter from "gray-matter";
import {
  upsertVaultIndexEntry,
  updateIndexingProgress,
  completeIndexing,
  failIndexing,
  getVaultIndexStatus,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

interface FileToIndex {
  path: string;
  name: string;
  sha: string;
}

interface BatchRequest {
  files: FileToIndex[];
  totalFiles: number;
  currentIndex: number;
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
    const body: BatchRequest = await request.json();
    const { files, totalFiles, currentIndex } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Fichiers manquants" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const context = await getAuthenticatedContext();

    if (!context || !session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;

    const vaultKey: VaultKey = {
      userId: session.user.id || session.user.email || "",
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };

    let indexedCount = 0;
    let failedCount = 0;

    for (const file of files) {
      try {
        const { content } = await getFileContent(octokit, file.path, vaultConfig);

        const privacyCheck = isPrivateContent(content);
        const { data: frontmatter } = matter(content);
        const wikilinks = parseWikilinks(content);

        // Parse tags from frontmatter and inline
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
          filePath: file.path,
          fileName: file.name.replace(/\.md$/, ""),
          fileSha: file.sha,
          tags: allTags,
          wikilinks: wikilinks.map((w) => ({
            target: w.target,
            display: w.display,
            isEmbed: w.isEmbed,
          })),
          frontmatter: frontmatter as Record<string, unknown>,
          isPrivate: privacyCheck.isPrivate,
        });

        indexedCount++;
      } catch (error) {
        console.error(`Failed to index ${file.path}:`, error);
        failedCount++;
      }
    }

    // Update progress
    const newIndexed = currentIndex + indexedCount;
    const newFailed = failedCount;

    // Check if completed
    const isComplete = newIndexed + newFailed >= totalFiles;

    if (isComplete) {
      const status = await getVaultIndexStatus(vaultKey);
      await completeIndexing(
        vaultKey,
        status?.indexedFiles || 0 + indexedCount,
        status?.failedFiles || 0 + failedCount
      );
    } else {
      const status = await getVaultIndexStatus(vaultKey);
      await updateIndexingProgress(
        vaultKey,
        (status?.indexedFiles || 0) + indexedCount,
        (status?.failedFiles || 0) + failedCount
      );
    }

    return NextResponse.json({
      status: isComplete ? "completed" : "in_progress",
      indexed: indexedCount,
      failed: failedCount,
      totalIndexed: newIndexed,
      totalFiles,
      isComplete,
    });
  } catch (error) {
    console.error("Error processing batch:", error);

    // Try to mark as failed
    try {
      const session = await getServerSession(authOptions);
      const context = await getAuthenticatedContext();
      if (context && session?.user) {
        const vaultKey: VaultKey = {
          userId: session.user.id || session.user.email || "",
          owner: context.vaultConfig.owner,
          repo: context.vaultConfig.repo,
          branch: context.vaultConfig.branch,
        };
        await failIndexing(vaultKey, String(error));
      }
    } catch {
      // Ignore
    }

    return NextResponse.json(
      { error: "Erreur lors du traitement du batch" },
      { status: 500 }
    );
  }
}
