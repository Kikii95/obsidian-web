import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import {
  getPublicVaultIndexEntries,
  getVaultIndexStatus,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

interface GraphNode {
  id: string;
  name: string;
  path: string;
  linkCount: number;
  isOrphan?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeOrphans = searchParams.get("includeOrphans") === "true";

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
        nodes: [],
        links: [],
        totalNotes: 0,
        connectedNotes: 0,
        orphanNotes: 0,
        fromIndex: false,
        needsIndex: true,
        message: "Index non disponible. Lancez l'indexation depuis les paramètres.",
      });
    }

    // Get all indexed entries (public only)
    const entries = await getPublicVaultIndexEntries(vaultKey);

    const nodes: Map<string, GraphNode> = new Map();
    const links: GraphLink[] = [];
    const linkCounts: Map<string, number> = new Map();

    // Initialize all nodes from index
    for (const entry of entries) {
      const id = entry.filePath.replace(".md", "");
      nodes.set(id, {
        id,
        name: entry.fileName,
        path: entry.filePath,
        linkCount: 0,
      });
    }

    // Build links from indexed wikilinks - NO API CALLS, just index data
    for (const entry of entries) {
      const sourceId = entry.filePath.replace(".md", "");
      const wikilinks = entry.wikilinks as { target: string; display?: string; isEmbed: boolean }[];

      for (const link of wikilinks) {
        if (link.isEmbed) continue; // Skip embeds

        // Try to resolve the link target
        let targetId = link.target;

        // Remove .md extension if present
        targetId = targetId.replace(/\.md$/, "");

        // If it's a simple name (no path), try to find matching node
        if (!targetId.includes("/")) {
          const found = Array.from(nodes.keys()).find(
            (id) => id.endsWith("/" + targetId) || id === targetId
          );
          if (found) targetId = found;
        }

        // Only add link if target exists in our nodes
        if (nodes.has(targetId)) {
          links.push({
            source: sourceId,
            target: targetId,
          });

          // Update link counts
          linkCounts.set(sourceId, (linkCounts.get(sourceId) || 0) + 1);
          linkCounts.set(targetId, (linkCounts.get(targetId) || 0) + 1);
        }
      }
    }

    // Update link counts in nodes
    for (const [id, count] of linkCounts) {
      const node = nodes.get(id);
      if (node) {
        node.linkCount = count;
      }
    }

    // Track connected nodes
    const connectedNodeIds = new Set<string>();
    for (const link of links) {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    }

    // Filter nodes based on includeOrphans parameter
    const filteredNodes = includeOrphans
      ? Array.from(nodes.values())
      : Array.from(nodes.values()).filter((node) => connectedNodeIds.has(node.id));

    // Mark orphan nodes
    const nodesWithOrphanFlag = filteredNodes.map((node) => ({
      ...node,
      isOrphan: !connectedNodeIds.has(node.id),
    }));

    return NextResponse.json({
      nodes: nodesWithOrphanFlag,
      links,
      totalNotes: entries.length,
      connectedNotes: connectedNodeIds.size,
      orphanNotes: nodes.size - connectedNodeIds.size,
      fromIndex: true,
    });
  } catch (error) {
    console.error("Error building graph:", error);
    return NextResponse.json(
      { error: "Erreur lors de la construction du graphe" },
      { status: 500 }
    );
  }
}
