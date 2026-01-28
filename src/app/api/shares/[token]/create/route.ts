import { NextRequest, NextResponse } from "next/server";
import { getShareContext } from "@/lib/server-share-context";
import { validateSharePath } from "@/lib/shares/validation";
import { createFile, getLastRateLimit } from "@/lib/github";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/shares/[token]/create - Create a file within share (writer mode only)
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

    const body = await request.json();
    const { path, content } = body;

    if (!path) {
      return NextResponse.json(
        { error: "Chemin requis" },
        { status: 400 }
      );
    }

    // Validate path is within share boundaries
    // For note shares, we need to validate against the parent folder
    const sharePath = share.shareType === "note"
      ? share.folderPath.split("/").slice(0, -1).join("/")
      : share.folderPath;

    if (!validateSharePath(path, sharePath, share.includeSubfolders)) {
      return NextResponse.json(
        { error: "Chemin non autorisé" },
        { status: 403 }
      );
    }

    // For note shares without subfolders, only allow creation in the same directory
    if (share.shareType === "note" && !share.includeSubfolders) {
      const pathDir = path.split("/").slice(0, -1).join("/");
      const shareDir = share.folderPath.split("/").slice(0, -1).join("/");
      if (pathDir !== shareDir) {
        return NextResponse.json(
          { error: "Création uniquement dans le même dossier que la note partagée" },
          { status: 403 }
        );
      }
    }

    // Default content for markdown files
    const fileName = path.split("/").pop() || "note";
    const defaultContent = path.endsWith(".md")
      ? `# ${fileName.replace(".md", "")}\n\n`
      : "";

    const result = await createFile(
      octokit,
      path,
      content || defaultContent,
      `Create ${fileName} via shared link`,
      vaultConfig
    );

    return NextResponse.json({
      success: true,
      path,
      sha: result.sha,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error creating file via share:", error);
    const message = error instanceof Error ? error.message : "Erreur création";

    // Handle "file already exists" error
    if (message.includes("sha") || message.includes("exists")) {
      return NextResponse.json(
        { error: "Un fichier existe déjà à cet emplacement" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
