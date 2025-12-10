import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function DELETE(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path, sha } = await request.json();

    if (!path || !sha) {
      return NextResponse.json(
        { error: "Chemin et SHA requis" },
        { status: 400 }
      );
    }

    const { octokit, vaultConfig } = context;
    await deleteFile(octokit, path, sha, `Delete ${path}`, vaultConfig);

    return NextResponse.json({
      success: true,
      path,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du fichier" },
      { status: 500 }
    );
  }
}
