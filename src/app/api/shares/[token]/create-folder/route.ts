import { NextRequest, NextResponse } from "next/server";
import { getShareContext } from "@/lib/server-share-context";
import { validateSharePath } from "@/lib/shares/validation";
import { createFile, getLastRateLimit } from "@/lib/github";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/shares/[token]/create-folder - Create a folder within share (writer mode only)
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

    // Check write permission
    if (share.mode !== "writer") {
      return NextResponse.json(
        { error: "Ce partage est en lecture seule" },
        { status: 403 }
      );
    }

    // Folder creation requires includeSubfolders
    if (!share.includeSubfolders) {
      return NextResponse.json(
        { error: "La création de dossiers n'est pas autorisée pour ce partage" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json(
        { error: "Chemin requis" },
        { status: 400 }
      );
    }

    // Check for invalid characters
    if (/[<>:"|?*]/.test(path)) {
      return NextResponse.json(
        { error: "Caractères invalides dans le nom de dossier" },
        { status: 400 }
      );
    }

    // Validate parent path is within share boundaries
    const parentPath = path.split("/").slice(0, -1).join("/");
    const sharePath = share.shareType === "note"
      ? share.folderPath.split("/").slice(0, -1).join("/")
      : share.folderPath;

    // The parent must be valid within the share
    if (parentPath && !validateSharePath(parentPath, sharePath, share.includeSubfolders)) {
      return NextResponse.json(
        { error: "Chemin non autorisé" },
        { status: 403 }
      );
    }

    // The new folder must also start with the share path
    if (!path.startsWith(sharePath + "/") && path !== sharePath) {
      return NextResponse.json(
        { error: "Chemin non autorisé" },
        { status: 403 }
      );
    }

    // Create folder via .gitkeep
    const folderName = path.split("/").pop() || "folder";
    const gitkeepPath = `${path}/.gitkeep`;

    const result = await createFile(
      octokit,
      gitkeepPath,
      "",
      `Create folder ${folderName} via shared link`,
      vaultConfig
    );

    return NextResponse.json({
      success: true,
      path,
      sha: result.sha,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error creating folder via share:", error);
    const message = error instanceof Error ? error.message : "Erreur création";

    // Handle "file already exists" error
    if (message.includes("sha") || message.includes("exists")) {
      return NextResponse.json(
        { error: "Un dossier existe déjà à cet emplacement" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
