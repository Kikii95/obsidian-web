import { NextResponse } from "next/server";
import { getFullVaultTree } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

interface FolderItem {
  name: string;
  path: string;
}

export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);

    // Extract unique folders
    const folderSet = new Set<string>();

    // Add root
    folderSet.add("");

    for (const file of allFiles) {
      if (file.type === "dir") {
        folderSet.add(file.path);
      } else {
        // Add parent folders from file paths
        const parts = file.path.split("/");
        let currentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
          folderSet.add(currentPath);
        }
      }
    }

    // Convert to sorted array
    const folders: FolderItem[] = Array.from(folderSet)
      .sort((a, b) => a.localeCompare(b))
      .map((path) => ({
        name: path ? path.split("/").pop()! : "Root",
        path,
      }));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des dossiers" },
      { status: 500 }
    );
  }
}
