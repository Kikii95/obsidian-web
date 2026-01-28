import { NextRequest, NextResponse } from "next/server";
import { getShareContext } from "@/lib/server-share-context";
import { getFileContent, getLastRateLimit } from "@/lib/github";
import { validateSharePath } from "@/lib/shares/validation";
import { getFileType, getMimeType } from "@/lib/file-types";
import matter from "gray-matter";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/shares/[token]/file?path=... - Get file content (public)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get requested path
    const url = new URL(request.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Le paramètre path est requis" },
        { status: 400 }
      );
    }

    // Validate path is within share boundaries
    // For note shares, only the exact note file is accessible
    if (share.shareType === "note") {
      // Normalize paths for comparison (handle encoding, slashes, etc.)
      const normalizePath = (p: string) =>
        decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

      const normalizedPath = normalizePath(path);
      const allowedPath = normalizePath(share.folderPath + ".md");

      if (normalizedPath !== allowedPath) {
        console.error("Note share path mismatch:", {
          requestedPath: normalizedPath,
          allowedPath,
          originalPath: path,
          shareFolderPath: share.folderPath
        });
        return NextResponse.json(
          { error: "Accès non autorisé à ce fichier" },
          { status: 403 }
        );
      }
    } else {
      // For folder shares, use standard path validation
      if (!validateSharePath(path, share.folderPath, share.includeSubfolders)) {
        return NextResponse.json(
          { error: "Accès non autorisé à ce fichier" },
          { status: 403 }
        );
      }
    }

    // Get file content
    const fileData = await getFileContent(octokit, path, vaultConfig);

    if (!fileData) {
      return NextResponse.json(
        { error: "Fichier non trouvé" },
        { status: 404 }
      );
    }

    const fileType = getFileType(path);
    const rateLimit = getLastRateLimit();

    // For markdown files, parse frontmatter and extract wikilinks
    if (fileType === "markdown") {
      const { data: frontmatter, content } = matter(fileData.content);

      // Extract wikilinks
      const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      const wikilinks: string[] = [];
      let match;
      while ((match = wikilinkRegex.exec(content)) !== null) {
        wikilinks.push(match[1]);
      }

      return NextResponse.json({
        path,
        content,
        rawContent: fileData.content,
        sha: fileData.sha,
        frontmatter,
        wikilinks,
        fileType,
        rateLimit,
      });
    }

    // For binary files, return base64 content
    if (fileType === "image" || fileType === "pdf" || fileType === "video") {
      // The content is already base64 for binary files
      const mimeType = getMimeType(path);

      return NextResponse.json({
        path,
        content: fileData.content,
        sha: fileData.sha,
        mimeType,
        fileType,
        rateLimit,
      });
    }

    // For other files (canvas, etc.), return raw content
    return NextResponse.json({
      path,
      content: fileData.content,
      sha: fileData.sha,
      fileType,
      rateLimit,
    });
  } catch (error) {
    console.error("Error fetching shared file:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du fichier" },
      { status: 500 }
    );
  }
}
