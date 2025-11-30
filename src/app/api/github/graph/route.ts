import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getFullVaultTree, getFileContent } from "@/lib/github";
import { parseWikilinks } from "@/lib/wikilinks";
import { filterPrivatePaths, isPrivateContent } from "@/lib/privacy";

interface GraphNode {
  id: string;
  name: string;
  path: string;
  linkCount: number;
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

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);

    // Get all files and filter private paths
    const allFiles = await getFullVaultTree(octokit);
    const publicFiles = filterPrivatePaths(allFiles);
    const mdFiles = publicFiles.filter(f => f.type === "file" && f.path.endsWith(".md"));

    // Track private file IDs discovered via content
    const privateFileIds = new Set<string>();

    const nodes: Map<string, GraphNode> = new Map();
    const links: GraphLink[] = [];
    const linkCounts: Map<string, number> = new Map();

    // Initialize all nodes
    for (const file of mdFiles) {
      const name = file.name.replace(".md", "");
      const id = file.path.replace(".md", "");
      nodes.set(id, {
        id,
        name,
        path: file.path,
        linkCount: 0,
      });
    }

    // Parse links from each file (limited to avoid rate limits)
    const filesToParse = mdFiles.slice(0, 100); // Limit for performance

    for (const file of filesToParse) {
      try {
        const { content } = await getFileContent(octokit, file.path);
        const sourceId = file.path.replace(".md", "");

        // Check if content marks this file as private
        const privacyCheck = isPrivateContent(content);
        if (privacyCheck.isPrivate) {
          privateFileIds.add(sourceId);
          continue; // Skip this file entirely
        }

        const wikilinks = parseWikilinks(content);

        for (const link of wikilinks) {
          if (link.isEmbed) continue; // Skip embeds

          // Try to resolve the link target
          let targetId = link.target;

          // If it's a simple name, try to find it
          if (!targetId.includes("/")) {
            const found = Array.from(nodes.keys()).find(
              id => id.endsWith("/" + targetId) || id === targetId
            );
            if (found) targetId = found;
          }

          // Only add link if target exists
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
      } catch {
        // Skip files that can't be read
        continue;
      }
    }

    // Update link counts in nodes
    for (const [id, count] of linkCounts) {
      const node = nodes.get(id);
      if (node) {
        node.linkCount = count;
      }
    }

    // Remove private nodes discovered during content parsing
    for (const privateId of privateFileIds) {
      nodes.delete(privateId);
    }

    // Filter out links to/from private nodes
    const publicLinks = links.filter(
      link => !privateFileIds.has(link.source) && !privateFileIds.has(link.target)
    );

    // Track connected nodes
    const connectedNodeIds = new Set<string>();
    for (const link of publicLinks) {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    }

    // Filter nodes based on includeOrphans parameter
    const filteredNodes = includeOrphans
      ? Array.from(nodes.values()) // Include all nodes
      : Array.from(nodes.values()).filter(node => connectedNodeIds.has(node.id));

    // Mark orphan nodes
    const nodesWithOrphanFlag = filteredNodes.map(node => ({
      ...node,
      isOrphan: !connectedNodeIds.has(node.id),
    }));

    return NextResponse.json({
      nodes: nodesWithOrphanFlag,
      links: publicLinks,
      totalNotes: mdFiles.length - privateFileIds.size,
      connectedNotes: connectedNodeIds.size,
      orphanNotes: nodes.size - connectedNodeIds.size,
    });
  } catch (error) {
    console.error("Error building graph:", error);
    return NextResponse.json(
      { error: "Erreur lors de la construction du graphe" },
      { status: 500 }
    );
  }
}
