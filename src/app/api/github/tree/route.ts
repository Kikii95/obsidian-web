import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getFullVaultTree } from "@/lib/github";
import { filterPrivatePaths } from "@/lib/privacy";
import type { VaultFile } from "@/types";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);
    const allFiles = await getFullVaultTree(octokit);

    // Filter out private paths (_private folders, etc.)
    const files = filterPrivatePaths(allFiles);

    // Build tree structure
    const tree = buildTree(files);

    return NextResponse.json({ tree });
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
