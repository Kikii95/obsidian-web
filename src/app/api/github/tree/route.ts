import { NextResponse } from "next/server";
import { getFullVaultTree, getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { isPrivatePath } from "@/lib/privacy";
import type { VaultFile } from "@/types";

export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);

    // Mark private paths as locked (instead of filtering)
    const filesWithLockStatus = allFiles.map(file => ({
      ...file,
      isLocked: isPrivatePath(file.path),
    }));

    // Build tree structure
    const tree = buildTree(filesWithLockStatus);

    // Include rate limit info in response
    const rateLimit = getLastRateLimit();

    return NextResponse.json({ tree, rateLimit });
  } catch (error) {
    console.error("Error fetching vault tree:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du vault" },
      { status: 500 }
    );
  }
}

function buildTree(files: VaultFile[]): VaultFile[] {
  const root: VaultFile[] = [];
  const map = new Map<string, VaultFile>();

  // Helper to ensure all parent directories exist
  const ensureParents = (path: string) => {
    const parts = path.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map.has(currentPath)) {
        const dirNode: VaultFile = {
          name: part,
          path: currentPath,
          type: "dir",
          children: [],
          isLocked: isPrivatePath(currentPath),
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

  // First pass: create all directories
  for (const file of files) {
    if (file.type === "dir") {
      ensureParents(file.path + "/dummy"); // Ensure parent dirs exist
      if (!map.has(file.path)) {
        const parts = file.path.split("/");
        const dirNode: VaultFile = {
          name: file.name,
          path: file.path,
          type: "dir",
          children: [],
          isLocked: file.isLocked,
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

        map.set(file.path, dirNode);
      }
    }
  }

  // Second pass: add all files
  for (const file of files) {
    if (file.type === "file") {
      const parts = file.path.split("/");
      ensureParents(file.path); // Ensure parent dirs exist

      const fileNode: VaultFile = {
        name: file.name,
        path: file.path,
        type: "file",
        isLocked: file.isLocked,
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

  // Sort children of each directory
  const sortChildren = (nodes: VaultFile[]) => {
    nodes.sort((a, b) => {
      // _Index.md always first
      if (a.name === "_Index.md") return -1;
      if (b.name === "_Index.md") return 1;
      // Directories before files
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      // Alphabetical
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
