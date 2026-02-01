import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import {
  getPublicVaultIndexEntries,
  getVaultIndexStatus,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

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
  fromIndex: boolean;
}

export async function GET() {
  try {
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
        tags: [],
        totalTags: 0,
        totalNotes: 0,
        fromIndex: false,
        needsIndex: true,
        message: "Index non disponible. Lancez l'indexation depuis les paramètres.",
      });
    }

    // Get all indexed entries (public only)
    const entries = await getPublicVaultIndexEntries(vaultKey);

    // Build tags map from index
    const tagsMap = new Map<string, TagInfo>();

    for (const entry of entries) {
      const noteInfo = { path: entry.filePath, name: entry.fileName };
      const tags = entry.tags as string[];

      for (const tag of tags) {
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
    }

    // Convert to array and sort by count
    const tags = Array.from(tagsMap.values()).sort((a, b) => b.count - a.count);

    const response: TagsResponse = {
      tags,
      totalTags: tags.length,
      totalNotes: entries.length,
      fromIndex: true,
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
