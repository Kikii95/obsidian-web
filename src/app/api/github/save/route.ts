import { NextRequest, NextResponse } from "next/server";
import { saveFileContent, getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { path, content, sha, message, encoding } = body;

    if (!path || content === undefined) {
      return NextResponse.json(
        { error: "Chemin et contenu requis" },
        { status: 400 }
      );
    }

    const { octokit, vaultConfig } = context;
    const result = await saveFileContent(
      octokit,
      path,
      content,
      sha,
      message || `Update ${path} via Obsidian Web`,
      vaultConfig,
      encoding // "base64" for binary files (images), undefined for text
    );

    return NextResponse.json({
      success: true,
      sha: result.sha,
      message: "Fichier sauvegardé",
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde" },
      { status: 500 }
    );
  }
}
