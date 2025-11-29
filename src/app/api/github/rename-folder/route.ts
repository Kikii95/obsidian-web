import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getFullVaultTree, getFileContent, createFile, deleteFile } from "@/lib/github";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { oldPath, newPath } = await request.json();

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "Ancien chemin et nouveau chemin requis" },
        { status: 400 }
      );
    }

    if (oldPath === newPath) {
      return NextResponse.json(
        { error: "L'ancien et le nouveau chemin sont identiques" },
        { status: 400 }
      );
    }

    const octokit = createOctokit(session.accessToken);

    // Get all files in the vault
    const allFiles = await getFullVaultTree(octokit);

    // Filter files that are inside the folder to rename
    const filesToMove = allFiles.filter(
      (file) => file.type === "file" &&
      (file.path === oldPath || file.path.startsWith(`${oldPath}/`))
    );

    if (filesToMove.length === 0) {
      return NextResponse.json(
        { error: "Dossier vide ou inexistant" },
        { status: 404 }
      );
    }

    // Move all files to the new location
    const errors: string[] = [];
    const moved: string[] = [];

    for (const file of filesToMove) {
      try {
        // Calculate new path for this file
        const relativePath = file.path.substring(oldPath.length);
        const newFilePath = newPath + relativePath;

        // Read file content
        const { content } = await getFileContent(octokit, file.path);

        // Create file at new location
        await createFile(
          octokit,
          newFilePath,
          content,
          `Move ${file.path} to ${newFilePath}`
        );

        // Delete old file
        if (file.sha) {
          await deleteFile(octokit, file.path, file.sha, `Move ${file.path} to ${newFilePath}`);
        }

        moved.push(file.path);
      } catch (err) {
        errors.push(file.path);
        console.error(`Error moving ${file.path}:`, err);
      }
    }

    if (errors.length > 0 && moved.length === 0) {
      return NextResponse.json(
        { error: "Erreur lors du renommage du dossier" },
        { status: 500 }
      );
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: true,
        partial: true,
        moved: moved.length,
        failed: errors,
        message: `${errors.length} fichier(s) n'ont pas pu être déplacés`,
      });
    }

    return NextResponse.json({
      success: true,
      moved: moved.length,
      oldPath,
      newPath,
    });
  } catch (error) {
    console.error("Error renaming folder:", error);
    return NextResponse.json(
      { error: "Erreur lors du renommage du dossier" },
      { status: 500 }
    );
  }
}
