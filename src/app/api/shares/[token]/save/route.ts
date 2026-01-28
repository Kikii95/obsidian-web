import { NextRequest, NextResponse } from "next/server";
import { getShareContext } from "@/lib/server-share-context";
import { saveFileContent, getLastRateLimit } from "@/lib/github";
import { validateSharePath } from "@/lib/shares/validation";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/shares/[token]/save - Save file content (writer mode only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const context = await getShareContext(token);

    if (!context) {
      return NextResponse.json(
        { error: "Partage non trouvé ou expiré" },
        { status: 404 }
      );
    }

    const { share, octokit, vaultConfig } = context;

    // Check if share allows writing
    if (share.mode !== "writer") {
      return NextResponse.json(
        { error: "Ce partage est en lecture seule" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { path, content, sha, message } = body;

    if (!path || content === undefined) {
      return NextResponse.json(
        { error: "Les paramètres path et content sont requis" },
        { status: 400 }
      );
    }

    // Validate path is within share boundaries
    if (!validateSharePath(path, share.folderPath, share.includeSubfolders)) {
      return NextResponse.json(
        { error: "Accès non autorisé à ce fichier" },
        { status: 403 }
      );
    }

    // Save using owner's token (from share context)
    const result = await saveFileContent(
      octokit,
      path,
      content,
      sha,
      message || `Update ${path.split("/").pop()} via shared link`,
      vaultConfig
    );

    return NextResponse.json({
      success: true,
      sha: result.sha,
      message: "Fichier sauvegardé",
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error saving shared file:", error);

    // Handle SHA conflict (file was modified)
    if (error instanceof Error && error.message.includes("409")) {
      return NextResponse.json(
        { error: "Le fichier a été modifié. Veuillez recharger et réessayer." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde" },
      { status: 500 }
    );
  }
}
