import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getFullVaultTree, deleteFile } from "@/lib/github";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: "Chemin du dossier requis" },
        { status: 400 }
      );
    }

    const octokit = createOctokit(session.accessToken);

    // Get all files in the vault
    const allFiles = await getFullVaultTree(octokit);

    // Filter files that are inside the folder to delete
    const filesToDelete = allFiles.filter(
      (file) => file.type === "file" &&
      (file.path === path || file.path.startsWith(`${path}/`))
    );

    if (filesToDelete.length === 0) {
      return NextResponse.json(
        { error: "Ce dossier n'existe pas dans GitHub (peut-être un artefact local)" },
        { status: 404 }
      );
    }

    // Delete all files in the folder (GitHub doesn't support deleting directories directly)
    const errors: string[] = [];

    for (const file of filesToDelete) {
      try {
        if (file.sha) {
          await deleteFile(octokit, file.path, file.sha, `Delete ${file.path}`);
        }
      } catch (err) {
        errors.push(file.path);
        console.error(`Error deleting ${file.path}:`, err);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: true,
        partial: true,
        deleted: filesToDelete.length - errors.length,
        failed: errors,
        message: `${errors.length} fichier(s) n'ont pas pu être supprimés`,
      });
    }

    return NextResponse.json({
      success: true,
      deleted: filesToDelete.length,
      path,
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du dossier" },
      { status: 500 }
    );
  }
}
