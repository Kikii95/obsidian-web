import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getFullVaultTree, getFileContent } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { buildTree } from "@/lib/tree-utils";
import type { VaultFile } from "@/types";

interface Template {
  name: string;
  path: string;
  preview?: string;
}

interface TemplateFolder {
  name: string;
  path: string;
  templates: Template[];
  subfolders: TemplateFolder[];
}

// Templates folder candidates (in order of priority)
const TEMPLATES_FOLDERS = ["Templates", "_templates", "templates", "_Templates"];

// Recursively process templates folder
async function processTemplatesFolder(
  octokit: Octokit,
  folder: VaultFile,
  vaultConfig: { owner: string; repo: string; branch: string },
  depth = 0
): Promise<{ templates: Template[]; subfolders: TemplateFolder[] }> {
  const templates: Template[] = [];
  const subfolders: TemplateFolder[] = [];

  if (!folder.children || depth > 3) return { templates, subfolders };

  for (const item of folder.children) {
    if (item.type === "dir") {
      // Recursively process subfolder
      const subfolder = await processTemplatesFolder(octokit, item, vaultConfig, depth + 1);
      if (subfolder.templates.length > 0 || subfolder.subfolders.length > 0) {
        subfolders.push({
          name: item.name,
          path: item.path,
          templates: subfolder.templates,
          subfolders: subfolder.subfolders,
        });
      }
    } else if (item.type === "file" && item.path.endsWith(".md")) {
      try {
        const { content } = await getFileContent(octokit, item.path, vaultConfig);

        // Get preview (first 200 chars, without frontmatter)
        let preview = content;
        if (preview.startsWith("---")) {
          const endIndex = preview.indexOf("---", 3);
          if (endIndex !== -1) {
            preview = preview.substring(endIndex + 3).trim();
          }
        }
        preview = preview.substring(0, 200).trim();
        if (content.length > 200) preview += "...";

        templates.push({
          name: item.name.replace(/\.md$/, ""),
          path: item.path,
          preview,
        });
      } catch {
        templates.push({
          name: item.name.replace(/\.md$/, ""),
          path: item.path,
        });
      }
    }
  }

  return { templates, subfolders };
}

// Flatten tree to get total count
function countTemplates(folder: TemplateFolder): number {
  return (
    folder.templates.length +
    folder.subfolders.reduce((acc, sub) => acc + countTemplates(sub), 0)
  );
}

// Flatten tree to flat list (for backward compatibility)
function flattenTemplates(folder: TemplateFolder): Template[] {
  return [
    ...folder.templates,
    ...folder.subfolders.flatMap((sub) => flattenTemplates(sub)),
  ];
}

export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;

    // Get all files (flat list)
    const flatFiles = await getFullVaultTree(octokit, false, vaultConfig);

    // Build tree structure with children
    const allFiles = buildTree(flatFiles);

    // Find templates folder (try multiple naming conventions)
    let templatesFolder = null;
    let foundFolderName = null;

    for (const folderName of TEMPLATES_FOLDERS) {
      const found = allFiles.find(
        (f) =>
          f.type === "dir" &&
          f.name.toLowerCase() === folderName.toLowerCase()
      );
      if (found && found.children && found.children.length > 0) {
        templatesFolder = found;
        foundFolderName = folderName;
        break;
      }
    }

    if (!templatesFolder || !templatesFolder.children) {
      return NextResponse.json({
        templates: [],
        tree: null,
        folder: TEMPLATES_FOLDERS[0],
        candidates: TEMPLATES_FOLDERS,
        message: `Créez un dossier "Templates" ou "_templates" pour utiliser les templates.`,
      });
    }

    // Process templates folder recursively
    const result = await processTemplatesFolder(octokit, templatesFolder, vaultConfig);

    // Build tree structure
    const tree: TemplateFolder = {
      name: foundFolderName!,
      path: templatesFolder.path,
      templates: result.templates,
      subfolders: result.subfolders,
    };

    // Flatten for backward compatibility
    const flatTemplates = flattenTemplates(tree);
    const count = countTemplates(tree);

    return NextResponse.json({
      templates: flatTemplates, // Flat list for backward compat
      tree, // Full tree structure
      folder: foundFolderName,
      count,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des templates" },
      { status: 500 }
    );
  }
}
