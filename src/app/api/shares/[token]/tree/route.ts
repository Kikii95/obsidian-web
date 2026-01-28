import { NextRequest, NextResponse } from "next/server";
import { getShareContext } from "@/lib/server-share-context";
import { getFullVaultTree, getLastRateLimit, getFileContent } from "@/lib/github";
import { validateSharePath } from "@/lib/shares/validation";
import type { VaultFile } from "@/types";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/shares/[token]/tree - Get folder tree for share (public)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const context = await getShareContext(token);

    if (!context) {
      return NextResponse.json(
        { error: "Partage non trouvé ou expiré" },
        { status: 404 }
      );
    }

    const { share, octokit, vaultConfig } = context;

    // Block access for deposit mode shares (deposit = upload only, no read)
    if (share.mode === "deposit") {
      return NextResponse.json(
        { error: "Ce partage est en mode dépôt uniquement" },
        { status: 403 }
      );
    }

    // Handle note shares: return single-file tree
    if (share.shareType === "note") {
      const notePath = share.folderPath + ".md";
      const noteName = share.folderPath.split("/").pop() || share.folderPath;
      const parentFolder = share.folderPath.split("/").slice(0, -1).join("/");
      const parentName = parentFolder.split("/").pop() || parentFolder || "Root";

      // Build a tree with just the shared note
      const tree: VaultFile[] = [
        {
          name: noteName + ".md",
          path: notePath,
          type: "file",
        },
      ];

      const rateLimit = getLastRateLimit();

      return NextResponse.json({
        tree,
        folderPath: parentFolder,
        folderName: parentName,
        shareType: "note",
        notePath: notePath,
        includeSubfolders: false,
        rateLimit,
      });
    }

    // Handle folder shares: full tree filtering
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);

    // Filter to only files within the shared folder
    const filteredFiles = allFiles.filter((file) =>
      validateSharePath(file.path, share.folderPath, share.includeSubfolders)
    );

    // Build tree structure rooted at shared folder
    const tree = buildShareTree(
      filteredFiles,
      share.folderPath,
      share.includeSubfolders
    );

    const rateLimit = getLastRateLimit();

    return NextResponse.json({
      tree,
      folderPath: share.folderPath,
      folderName: share.folderPath.split("/").pop() || share.folderPath,
      shareType: "folder",
      includeSubfolders: share.includeSubfolders,
      rateLimit,
    });
  } catch (error) {
    console.error("Error fetching share tree:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du contenu" },
      { status: 500 }
    );
  }
}

/**
 * Build tree structure for shared folder
 */
function buildShareTree(
  files: VaultFile[],
  shareFolderPath: string,
  includeSubfolders: boolean
): VaultFile[] {
  const root: VaultFile[] = [];
  const map = new Map<string, VaultFile>();

  // Helper to get path relative to share folder
  const getRelativePath = (path: string) => {
    if (path === shareFolderPath) return "";
    if (path.startsWith(shareFolderPath + "/")) {
      return path.slice(shareFolderPath.length + 1);
    }
    return path;
  };

  // Helper to ensure all parent directories exist
  const ensureParents = (relativePath: string) => {
    const parts = relativePath.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map.has(currentPath)) {
        const dirNode: VaultFile = {
          name: part,
          path: shareFolderPath ? `${shareFolderPath}/${currentPath}` : currentPath,
          type: "dir",
          children: [],
        };

        if (parentPath === "") {
          root.push(dirNode);
        } else {
          const parent = map.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(dirNode);
          }
        }

        map.set(currentPath, dirNode);
      }
    }
  };

  // Process files
  for (const file of files) {
    const relativePath = getRelativePath(file.path);

    // Skip the share folder itself
    if (!relativePath) continue;

    // If subfolders not included, skip nested files
    if (!includeSubfolders && relativePath.includes("/")) continue;

    if (file.type === "dir") {
      ensureParents(relativePath + "/dummy");
      if (!map.has(relativePath)) {
        const parts = relativePath.split("/");
        const dirNode: VaultFile = {
          name: file.name,
          path: file.path,
          type: "dir",
          children: [],
        };

        if (parts.length === 1) {
          root.push(dirNode);
        } else {
          const parentPath = parts.slice(0, -1).join("/");
          const parent = map.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(dirNode);
          }
        }

        map.set(relativePath, dirNode);
      }
    } else {
      ensureParents(relativePath);
      const parts = relativePath.split("/");
      const fileNode: VaultFile = {
        name: file.name,
        path: file.path,
        type: "file",
      };

      if (parts.length === 1) {
        root.push(fileNode);
      } else {
        const parentPath = parts.slice(0, -1).join("/");
        const parent = map.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(fileNode);
        }
      }
    }
  }

  // Sort children
  const sortChildren = (nodes: VaultFile[]) => {
    nodes.sort((a, b) => {
      if (a.name === "_Index.md") return -1;
      if (b.name === "_Index.md") return 1;
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
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
