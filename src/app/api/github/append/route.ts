import { NextRequest, NextResponse } from "next/server";
import { getFileContent, saveFileContent, getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { path, content, message } = body;

    if (!path || !content) {
      return NextResponse.json(
        { error: "Chemin et contenu requis" },
        { status: 400 }
      );
    }

    const { octokit, vaultConfig } = context;

    try {
      // Try to get existing file
      const existing = await getFileContent(octokit, path, vaultConfig);

      // Append content
      const newContent = existing.content + content;

      // Save updated file
      const result = await saveFileContent(
        octokit,
        path,
        newContent,
        existing.sha,
        message || `Append to ${path} via Quick Capture`,
        vaultConfig
      );

      return NextResponse.json({
        success: true,
        sha: result.sha,
        message: "Contenu ajouté",
        rateLimit: getLastRateLimit(),
      });
    } catch (readError) {
      // File doesn't exist - return 404 so caller can create it
      if ((readError as { status?: number })?.status === 404) {
        return NextResponse.json(
          { error: "Fichier non trouvé", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      throw readError;
    }
  } catch (error) {
    console.error("Error appending to file:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout au fichier" },
      { status: 500 }
    );
  }
}
