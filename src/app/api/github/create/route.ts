import { NextRequest, NextResponse } from "next/server";
import { createFile } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path, content, title } = await request.json();

    if (!path) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    // Ensure path ends with .md
    const filePath = path.endsWith(".md") ? path : `${path}.md`;

    // Build initial content
    const initialContent = content || `# ${title || "Nouvelle note"}\n\n`;

    const { octokit, vaultConfig } = context;
    const result = await createFile(
      octokit,
      filePath,
      initialContent,
      `Create ${filePath}`,
      vaultConfig
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
