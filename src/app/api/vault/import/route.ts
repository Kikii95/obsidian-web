import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { joinPath } from "@/lib/tree-utils";

interface ImportFile {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
}

interface ImportResult {
  success: string[];
  skipped: string[];
  errors: string[];
}

type ConflictStrategy = "skip" | "rename" | "overwrite";

/**
 * POST /api/vault/import
 * Import files into the user's vault from a share export
 *
 * Body: {
 *   files: ImportFile[],
 *   targetPath: string,
 *   conflictStrategy: "skip" | "rename" | "overwrite"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      files,
      targetPath,
      conflictStrategy = "rename",
    } = body as {
      files: ImportFile[];
      targetPath: string;
      conflictStrategy: ConflictStrategy;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Fichiers requis" },
        { status: 400 }
      );
    }

    const { octokit, vaultConfig } = context;

    const result: ImportResult = {
      success: [],
      skipped: [],
      errors: [],
    };

    for (const file of files) {
      try {
        // Build destination path
        let destPath = joinPath(
          vaultConfig.rootPath || "",
          targetPath || "",
          file.path
        );

        // Check if file exists
        let exists = false;
        let existingSha: string | undefined;

        try {
          const { data } = await octokit.repos.getContent({
            owner: vaultConfig.owner,
            repo: vaultConfig.repo,
            path: destPath,
            ref: vaultConfig.branch,
          });

          if (!Array.isArray(data) && data.type === "file") {
            exists = true;
            existingSha = data.sha;
          }
        } catch {
          // File doesn't exist - that's fine
        }

        // Handle conflict
        if (exists) {
          if (conflictStrategy === "skip") {
            result.skipped.push(destPath);
            continue;
          } else if (conflictStrategy === "rename") {
            destPath = await getUniquePath(
              octokit,
              vaultConfig,
              destPath
            );
          }
          // overwrite: continue with existingSha to update
        }

        // Prepare content
        let base64Content: string;
        if (file.encoding === "base64") {
          base64Content = file.content;
        } else {
          base64Content = Buffer.from(file.content, "utf-8").toString("base64");
        }

        // Create or update file
        await octokit.repos.createOrUpdateFileContents({
          owner: vaultConfig.owner,
          repo: vaultConfig.repo,
          path: destPath,
          message: `Import ${file.path}`,
          content: base64Content,
          sha: conflictStrategy === "overwrite" ? existingSha : undefined,
          branch: vaultConfig.branch,
        });

        result.success.push(destPath);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`${file.path}: ${msg}`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import" },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique path by adding _copy, _copy2, etc.
 */
async function getUniquePath(
  octokit: ReturnType<typeof import("@/lib/github").createOctokit>,
  vaultConfig: { owner: string; repo: string; branch: string },
  originalPath: string
): Promise<string> {
  // Extract extension and base name
  const lastDot = originalPath.lastIndexOf(".");
  const lastSlash = originalPath.lastIndexOf("/");

  let basePath: string;
  let extension: string;

  if (lastDot > lastSlash) {
    basePath = originalPath.slice(0, lastDot);
    extension = originalPath.slice(lastDot);
  } else {
    basePath = originalPath;
    extension = "";
  }

  let counter = 1;
  let newPath = `${basePath}_copy${extension}`;

  while (counter < 100) {
    try {
      await octokit.repos.getContent({
        owner: vaultConfig.owner,
        repo: vaultConfig.repo,
        path: newPath,
        ref: vaultConfig.branch,
      });
      // File exists, try next number
      counter++;
      newPath = `${basePath}_copy${counter}${extension}`;
    } catch {
      // File doesn't exist - use this path
      return newPath;
    }
  }

  // Fallback with timestamp
  return `${basePath}_${Date.now()}${extension}`;
}
