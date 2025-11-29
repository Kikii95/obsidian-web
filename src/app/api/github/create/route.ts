import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, createFile } from "@/lib/github";
import { isPrivatePath } from "@/lib/privacy";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path, content, title } = await request.json();

    if (!path) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    // Ensure path ends with .md
    const filePath = path.endsWith(".md") ? path : `${path}.md`;

    // Check if trying to create in private folder
    if (isPrivatePath(filePath)) {
      return NextResponse.json(
        { error: "Impossible de créer dans un dossier privé" },
        { status: 403 }
      );
    }

    // Build initial content
    const initialContent = content || `# ${title || "Nouvelle note"}\n\n`;

    const octokit = createOctokit(session.accessToken);
    const result = await createFile(
      octokit,
      filePath,
      initialContent,
      `Create ${filePath}`
    );

    return NextResponse.json({
      success: true,
      path: filePath,
      sha: result.sha,
    });
  } catch (error) {
    console.error("Error creating file:", error);

    // Check if file already exists
    if ((error as { status?: number })?.status === 422) {
      return NextResponse.json(
        { error: "Un fichier avec ce nom existe déjà" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la création du fichier" },
      { status: 500 }
    );
  }
}
