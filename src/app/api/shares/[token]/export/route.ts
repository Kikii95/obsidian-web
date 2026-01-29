import { NextRequest, NextResponse } from "next/server";
import { getShareContext } from "@/lib/server-share-context";
import { getFileType } from "@/lib/file-types";
import { joinPath } from "@/lib/tree-utils";

interface ExportedFile {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
  size: number;
}

/**
 * POST /api/shares/[token]/export
 * Export files from a share for copying to user's vault
 *
 * Body: { paths: string[] }
 * Returns: { files: ExportedFile[] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { paths } = body as { paths: string[] };

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: "Chemins requis" },
        { status: 400 }
      );
    }

    // Get share context
    const ctx = await getShareContext(token);
    if (!ctx) {
      return NextResponse.json(
        { error: "Partage invalide ou expiré" },
        { status: 404 }
      );
    }

    // Block deposit mode
    if (ctx.share.mode === "deposit") {
      return NextResponse.json(
        { error: "Export non autorisé en mode dépôt" },
        { status: 403 }
      );
    }

    // Block if copy is not allowed
    if (!ctx.share.allowCopy) {
      return NextResponse.json(
        { error: "La copie n'est pas autorisée pour ce partage" },
        { status: 403 }
      );
    }

    const sharePath = ctx.share.folderPath;
    const { octokit, vaultConfig } = ctx;
    const rootPath = vaultConfig.rootPath || "";

    // Validate all paths are within share
    for (const path of paths) {
      if (!path.startsWith(sharePath)) {
        return NextResponse.json(
          { error: `Chemin hors du partage: ${path}` },
          { status: 400 }
        );
      }
    }

    // Collect files
    const files: ExportedFile[] = [];

    for (const path of paths) {
      try {
        // Build GitHub path (prepend rootPath if configured)
        const githubPath = joinPath(rootPath, path);

        // Get file/directory info
        const { data } = await octokit.repos.getContent({
          owner: vaultConfig.owner,
          repo: vaultConfig.repo,
          path: githubPath,
          ref: vaultConfig.branch,
        });

        if (Array.isArray(data)) {
          // It's a directory - recursively get all files
          const dirFiles = await exportDirectory(
            octokit,
            vaultConfig,
            path,
            sharePath,
            rootPath
          );
          files.push(...dirFiles);
        } else if (data.type === "file") {
          // It's a file
          const relativePath = path.slice(sharePath.length + 1);
          const file = await exportFile(octokit, vaultConfig, path, relativePath, rootPath);
          if (file) files.push(file);
        }
      } catch (error) {
        console.error(`Error exporting ${path}:`, error);
        // Continue with other files
      }
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}

/**
 * Export a single file
 */
async function exportFile(
  octokit: ReturnType<typeof import("@/lib/github").createOctokit>,
  vaultConfig: { owner: string; repo: string; branch: string },
  fullPath: string,
  relativePath: string,
  rootPath: string
): Promise<ExportedFile | null> {
  try {
    // Build GitHub path with rootPath
    const githubPath = joinPath(rootPath, fullPath);

    const { data } = await octokit.repos.getContent({
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      path: githubPath,
      ref: vaultConfig.branch,
    });

    if (Array.isArray(data) || data.type !== "file") {
      return null;
    }

    // Determine if binary or text
    const fileType = getFileType(fullPath);
    const isBinary = ["image", "pdf", "video", "audio"].includes(fileType);

    let content: string;

    if (data.content) {
      // Small file - content is base64 encoded
      const cleanBase64 = data.content.replace(/\n/g, "");

      if (isBinary) {
        // Keep as base64 for binary files
        content = cleanBase64;
      } else {
        // Decode to UTF-8 for text files
        content = Buffer.from(cleanBase64, "base64").toString("utf-8");
      }
    } else if (data.download_url) {
      // Large file - fetch from download URL
      const response = await fetch(data.download_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      if (isBinary) {
        const arrayBuffer = await response.arrayBuffer();
        content = Buffer.from(arrayBuffer).toString("base64");
      } else {
        content = await response.text();
      }
    } else {
      return null;
    }

    return {
      path: relativePath,
      content,
      encoding: isBinary ? "base64" : "utf-8",
      size: data.size,
    };
  } catch (error) {
    console.error(`Error exporting file ${fullPath}:`, error);
    return null;
  }
}

/**
 * Recursively export a directory
 */
async function exportDirectory(
  octokit: ReturnType<typeof import("@/lib/github").createOctokit>,
  vaultConfig: { owner: string; repo: string; branch: string },
  dirPath: string,
  sharePath: string,
  rootPath: string
): Promise<ExportedFile[]> {
  const files: ExportedFile[] = [];

  try {
    // Build GitHub path with rootPath
    const githubPath = joinPath(rootPath, dirPath);

    const { data } = await octokit.repos.getContent({
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      path: githubPath,
      ref: vaultConfig.branch,
    });

    if (!Array.isArray(data)) {
      return files;
    }

    for (const item of data) {
      // Convert GitHub path back to vault-relative path
      const vaultPath = rootPath && item.path.startsWith(rootPath + "/")
        ? item.path.slice(rootPath.length + 1)
        : item.path;

      if (item.type === "file") {
        const relativePath = vaultPath.slice(sharePath.length + 1);
        const file = await exportFile(octokit, vaultConfig, vaultPath, relativePath, rootPath);
        if (file) files.push(file);
      } else if (item.type === "dir") {
        // Recursively export subdirectory
        const subFiles = await exportDirectory(
          octokit,
          vaultConfig,
          vaultPath,
          sharePath,
          rootPath
        );
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error(`Error exporting directory ${dirPath}:`, error);
  }

  return files;
}
