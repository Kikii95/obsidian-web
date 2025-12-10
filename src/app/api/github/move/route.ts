import { NextRequest, NextResponse } from "next/server";
import { getFileContent, createFile, deleteFile } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { oldPath, newPath, sha } = await request.json();

    if (!oldPath || !newPath || !sha) {
      return NextResponse.json(
        { error: "Ancien chemin, nouveau chemin et SHA requis" },
        { status: 400 }
      );
    }

    if (oldPath === newPath) {
      return NextResponse.json(
        { error: "L'ancien et le nouveau chemin sont identiques" },
        { status: 400 }
      );
    }

    const { octokit, vaultConfig } = context;

    // 1. Read the current file content
    const { content } = await getFileContent(octokit, oldPath, vaultConfig);

    // 2. Create the file at the new location
    const createResult = await createFile(
      octokit,
      newPath,
      content,
      `Move ${oldPath} to ${newPath}`,
      vaultConfig
    );

    // 3. Delete the old file
    await deleteFile(octokit, oldPath, sha, `Move ${oldPath} to ${newPath}`, vaultConfig);

    return NextResponse.json({
      success: true,
      oldPath,
      newPath,
      sha: createResult.sha,
    });
  } catch (error) {
    console.error("Error moving file:", error);
    return NextResponse.json(
      { error: "Erreur lors du déplacement du fichier" },
      { status: 500 }
    );
  }
}
