import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import {
  getAllVaultIndexEntries,
  upsertVaultIndexEntry,
  type VaultKey,
} from "@/lib/db/vault-index-queries";
import matter from "gray-matter";

interface BulkTagRequest {
  action: "rename" | "merge" | "delete";
  tag: string;
  newTag?: string; // For rename/merge
  preview?: boolean; // Just show affected notes
}

interface AffectedNote {
  path: string;
  name: string;
}

export async function POST(request: Request) {
  try {
    const body: BulkTagRequest = await request.json();
    const { action, tag, newTag, preview = false } = body;

    if (!tag) {
      return NextResponse.json(
        { error: "Le tag est requis" },
        { status: 400 }
      );
    }

    if ((action === "rename" || action === "merge") && !newTag) {
      return NextResponse.json(
        { error: "Le nouveau tag est requis pour cette action" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const context = await getAuthenticatedContext();

    if (!context || !session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;
    const { owner, repo } = vaultConfig;

    const vaultKey: VaultKey = {
      userId: session.user.id || session.user.email || "",
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };

    // Find all notes with this tag from the index
    const allEntries = await getAllVaultIndexEntries(vaultKey);
    const notesWithTag = allEntries.filter((entry) => {
      const tags = Array.isArray(entry.tags) ? entry.tags : [];
      return tags.includes(tag);
    });

    const affectedNotes: AffectedNote[] = notesWithTag.map((n) => ({
      path: n.filePath,
      name: n.fileName,
    }));

    // Preview mode - just return affected notes
    if (preview) {
      return NextResponse.json({
        action,
        tag,
        newTag,
        affectedNotes,
        count: affectedNotes.length,
      });
    }

    // Execute the action
    const results: {
      success: string[];
      failed: { path: string; error: string }[];
    } = {
      success: [],
      failed: [],
    };

    for (const note of notesWithTag) {
      try {
        // Get current file content
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: note.filePath,
        });

        if (Array.isArray(fileData) || fileData.type !== "file") {
          results.failed.push({ path: note.filePath, error: "Not a file" });
          continue;
        }

        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        const { data: frontmatter, content: body } = matter(content);

        // Get current tags
        let tags: string[] = Array.isArray(frontmatter.tags)
          ? frontmatter.tags
          : frontmatter.tags
          ? [frontmatter.tags]
          : [];

        // Apply action
        switch (action) {
          case "rename":
            tags = tags.map((t) => (t === tag ? newTag! : t));
            break;
          case "merge":
            // Remove old tag, add new if not present
            tags = tags.filter((t) => t !== tag);
            if (!tags.includes(newTag!)) {
              tags.push(newTag!);
            }
            break;
          case "delete":
            tags = tags.filter((t) => t !== tag);
            break;
        }

        // Update frontmatter
        if (tags.length > 0) {
          frontmatter.tags = tags;
        } else {
          delete frontmatter.tags;
        }

        // Rebuild file content
        const newContent = matter.stringify(body, frontmatter);

        // Commit change
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: note.filePath,
          message: `[bulk] ${action} tag "${tag}"${newTag ? ` → "${newTag}"` : ""}`,
          content: Buffer.from(newContent).toString("base64"),
          sha: fileData.sha,
        });

        // Update index
        await upsertVaultIndexEntry({
          ...note,
          tags,
          updatedAt: new Date(),
        });

        results.success.push(note.filePath);
      } catch (err) {
        results.failed.push({
          path: note.filePath,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      action,
      tag,
      newTag,
      results,
      successCount: results.success.length,
      failedCount: results.failed.length,
    });
  } catch (error) {
    console.error("Bulk tag error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'opération en masse" },
      { status: 500 }
    );
  }
}
