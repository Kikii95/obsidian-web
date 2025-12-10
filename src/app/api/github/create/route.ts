import { NextRequest, NextResponse } from "next/server";
import { createFile, saveFileContent } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { path, content, title, binary } = await request.json();

    if (!path) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    const { octokit, vaultConfig } = context;

    // Binary file upload (base64 encoded content)
    if (binary) {
      // For binary files, use saveFileContent directly with base64
      // The content is already base64 encoded from the client
      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner: vaultConfig.owner,
        repo: vaultConfig.repo,
        path: vaultConfig.rootPath ? `${vaultConfig.rootPath}/${path}` : path,
        message: `Upload ${path}`,
        content, // Already base64
        branch: vaultConfig.branch,
      });

      return NextResponse.json({
        success: true,
        path,
        sha: data.content?.sha || "",
      });
    }

    // Text file (markdown, canvas, etc.)
    // For .md files without content, use default template
    const isMarkdown = path.endsWith(".md");
    let filePath = path;
    let fileContent = content;

    if (isMarkdown && !content) {
      // Legacy behavior: add .md if not present for notes
      filePath = path.endsWith(".md") ? path : `${path}.md`;
      fileContent = `# ${title || "Nouvelle note"}\n\n`;
    } else if (!content) {
      fileContent = "";
    }

    const result = await createFile(
      octokit,
      filePath,
      fileContent,
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
