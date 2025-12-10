import { NextRequest, NextResponse } from "next/server";
import { createFile } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: "Chemin du dossier requis" },
        { status: 400 }
      );
    }

    // Validate path - no special characters
    if (/[<>:"|?*]/.test(path)) {
      return NextResponse.json(
        { error: "Caractères invalides dans le chemin" },
        { status: 400 }
      );
    }

    const { octokit, vaultConfig } = context;

    // Create folder by creating a .gitkeep file inside it
    const gitkeepPath = `${path}/.gitkeep`;

    const result = await createFile(
      octokit,
      gitkeepPath,
      "", // Empty content
      `Create folder ${path}`,
      vaultConfig
    );

    return NextResponse.json({
      success: true,
      path,
      sha: result.sha,
    });
  } catch (error) {
    console.error("Error creating folder:", error);

    // Check if file already exists
    if (error instanceof Error && error.message.includes("422")) {
      return NextResponse.json(
        { error: "Ce dossier existe déjà" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la création du dossier" },
      { status: 500 }
    );
  }
}
