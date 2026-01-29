import { NextRequest, NextResponse } from "next/server";
import { createPublicOctokit, getFullVaultTree, getLastRateLimit } from "@/lib/github";
import type { VaultFile } from "@/types";

interface RouteParams {
  params: Promise<{ owner: string; repo: string }>;
}

/**
 * Build tree structure from flat file list
 */
function buildTree(files: VaultFile[]): VaultFile[] {
  const root: VaultFile[] = [];
  const map = new Map<string, VaultFile>();

  // First pass: create all directories
  for (const file of files) {
    if (file.type === "dir") {
      const parts = file.path.split("/");
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!map.has(currentPath)) {
          const node: VaultFile = {
            name: part,
            path: currentPath,
            type: "dir",
            children: [],
          };

          if (parentPath === "") {
            root.push(node);
          } else {
            const parent = map.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(node);
            }
          }

          map.set(currentPath, node);
        }
      }
    }
  }

  // Second pass: add files to their parent directories
  for (const file of files) {
    if (file.type === "file") {
      const parts = file.path.split("/");
      const fileName = parts.pop() || file.name;
      const parentPath = parts.join("/");

      const fileNode: VaultFile = {
        name: fileName,
        path: file.path,
        type: "file",
        sha: file.sha,
      };

      if (parentPath === "") {
        root.push(fileNode);
      } else {
        // Ensure parent exists
        if (!map.has(parentPath)) {
          // Create parent directories
          let currentPath = "";
          for (const part of parts) {
            const prevPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!map.has(currentPath)) {
              const node: VaultFile = {
                name: part,
                path: currentPath,
                type: "dir",
                children: [],
              };

              if (prevPath === "") {
                root.push(node);
              } else {
                const parent = map.get(prevPath);
                if (parent && parent.children) {
                  parent.children.push(node);
                }
              }

              map.set(currentPath, node);
            }
          }
        }

        const parent = map.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(fileNode);
        }
      }
    }
  }

  // Sort children: dirs first, then alphabetically
  const sortChildren = (nodes: VaultFile[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    for (const node of nodes) {
      if (node.children) {
        sortChildren(node.children);
      }
    }
  };

  sortChildren(root);

  return root;
}

/**
 * GET /api/temp/[owner]/[repo]/tree - Get folder tree for public repo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { owner, repo } = await params;
    const searchParams = request.nextUrl.searchParams;
    const branch = searchParams.get("branch") || undefined;
    const rootPath = searchParams.get("root") || "";

    const octokit = createPublicOctokit();

    // Get repo info (verifies existence + gets default branch)
    let repoInfo;
    try {
      const { data } = await octokit.repos.get({ owner, repo });
      repoInfo = data;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) {
        return NextResponse.json(
          { error: "Repository not found or is private" },
          { status: 404 }
        );
      }
      if (err.status === 403) {
        const rateLimit = getLastRateLimit();
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Try again later.",
            rateLimit,
            resetAt: rateLimit?.reset ? new Date(rateLimit.reset * 1000).toISOString() : null,
          },
          { status: 429 }
        );
      }
      throw error;
    }

    const effectiveBranch = branch || repoInfo.default_branch;

    // Get full tree
    const flatTree = await getFullVaultTree(octokit, false, {
      owner,
      repo,
      branch: effectiveBranch,
      rootPath,
    });

    // Build hierarchical tree
    const tree = buildTree(flatTree);

    const rateLimit = getLastRateLimit();

    return NextResponse.json({
      tree,
      repoInfo: {
        name: repoInfo.name,
        owner: repoInfo.owner.login,
        branch: effectiveBranch,
        defaultBranch: repoInfo.default_branch,
        description: repoInfo.description || null,
        stars: repoInfo.stargazers_count,
        isPrivate: repoInfo.private,
      },
      rateLimit,
    });
  } catch (error: unknown) {
    console.error("Error fetching temp vault tree:", error);
    const err = error as { status?: number; message?: string };

    if (err.status === 403) {
      const rateLimit = getLastRateLimit();
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          rateLimit,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to fetch repository tree" },
      { status: 500 }
    );
  }
}
