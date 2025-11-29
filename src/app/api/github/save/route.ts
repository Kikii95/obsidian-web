import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, saveFileContent } from "@/lib/github";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { path, content, sha, message } = body;

    if (!path || content === undefined) {
      return NextResponse.json(
        { error: "Chemin et contenu requis" },
        { status: 400 }
      );
    }

    const octokit = createOctokit(session.accessToken);
    const result = await saveFileContent(
      octokit,
      path,
      content,
      sha,
      message || `Update ${path} via Obsidian Web`
    );

    return NextResponse.json({
      success: true,
      sha: result.sha,
      message: "Fichier sauvegardé",
    });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde" },
      { status: 500 }
    );
  }
}
