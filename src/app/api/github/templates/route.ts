import { NextResponse } from "next/server";
import { getFullVaultTree, getFileContent } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

interface Template {
  name: string;
  path: string;
  preview?: string; // First 200 chars
}

// Templates folder (customizable later via settings)
const TEMPLATES_FOLDER = "Templates";

export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;

    // Get all files
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);

    // Find templates folder
    const templatesFolder = allFiles.find(
      (f) =>
        f.type === "dir" &&
        f.name.toLowerCase() === TEMPLATES_FOLDER.toLowerCase()
    );

    if (!templatesFolder || !templatesFolder.children) {
      return NextResponse.json({
        templates: [],
        folder: TEMPLATES_FOLDER,
        message: `Créez un dossier "${TEMPLATES_FOLDER}" pour utiliser les templates`,
      });
    }

    // Get markdown files in templates folder
    const templateFiles = templatesFolder.children.filter(
      (f) => f.type === "file" && f.path.endsWith(".md")
    );

    const templates: Template[] = [];

    for (const file of templateFiles.slice(0, 20)) {
      try {
        const { content } = await getFileContent(octokit, file.path, vaultConfig);

        // Get preview (first 200 chars, without frontmatter)
        let preview = content;

        // Remove frontmatter
        if (preview.startsWith("---")) {
          const endIndex = preview.indexOf("---", 3);
          if (endIndex !== -1) {
            preview = preview.substring(endIndex + 3).trim();
          }
        }

        // Truncate
        preview = preview.substring(0, 200).trim();
        if (content.length > 200) preview += "...";

        templates.push({
          name: file.name.replace(/\.md$/, ""),
          path: file.path,
          preview,
        });
      } catch {
        // Include template without preview if content can't be read
        templates.push({
          name: file.name.replace(/\.md$/, ""),
          path: file.path,
        });
      }
    }

    return NextResponse.json({
      templates,
      folder: TEMPLATES_FOLDER,
      count: templates.length,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des templates" },
      { status: 500 }
    );
  }
}
