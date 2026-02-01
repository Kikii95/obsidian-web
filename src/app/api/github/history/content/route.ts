import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const sha = searchParams.get("sha");

    if (!path) {
      return NextResponse.json(
        { error: "Le paramètre 'path' est requis" },
        { status: 400 }
      );
    }

    if (!sha) {
      return NextResponse.json(
        { error: "Le paramètre 'sha' est requis" },
        { status: 400 }
      );
    }

    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;

    const owner = vaultConfig.owner;
    const repo = vaultConfig.repo;

    // Get file content at specific commit
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: sha,
    });

    if (Array.isArray(fileData) || fileData.type !== "file") {
      return NextResponse.json(
        { error: "Le chemin ne correspond pas à un fichier" },
        { status: 400 }
      );
    }

    // Decode base64 content
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    return NextResponse.json({
      content,
      sha: fileData.sha,
      path,
      commitSha: sha,
    });
  } catch (error: unknown) {
    console.error("Error fetching file at commit:", error);

    // Handle 404 (file didn't exist at that commit)
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      return NextResponse.json(
        { error: "Fichier non trouvé à ce commit", content: null },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération du contenu" },
      { status: 500 }
    );
  }
}
