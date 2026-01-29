import { NextRequest, NextResponse } from "next/server";
import { createPublicOctokit, getLastRateLimit } from "@/lib/github";
import { getFileType, getMimeType } from "@/lib/file-types";
import matter from "gray-matter";

interface RouteParams {
  params: Promise<{ owner: string; repo: string }>;
}

/**
 * GET /api/temp/[owner]/[repo]/file?path=... - Get file content from public repo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { owner, repo } = await params;
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");
    const branch = searchParams.get("branch") || undefined;
    const rootPath = searchParams.get("root") || "";

    if (!path) {
      return NextResponse.json(
        { error: "path parameter is required" },
        { status: 400 }
      );
    }

    const octokit = createPublicOctokit();

    // Get repo default branch if not specified
    let effectiveBranch = branch;
    if (!effectiveBranch) {
      try {
        const { data: repoInfo } = await octokit.repos.get({ owner, repo });
        effectiveBranch = repoInfo.default_branch;
      } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status === 404) {
          return NextResponse.json(
            { error: "Repository not found or is private" },
            { status: 404 }
          );
        }
        if (err.status === 403) {
          const rateLimit = getLastRateLimit();
          return NextResponse.json(
            { error: "Rate limit exceeded", rateLimit },
            { status: 429 }
          );
        }
        throw error;
      }
    }

    // Build full path with rootPath if specified
    const fullPath = rootPath ? `${rootPath}/${path}` : path;

    // Get file content
    let fileData;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: fullPath,
        ref: effectiveBranch,
      });

      if (Array.isArray(data) || data.type !== "file") {
        return NextResponse.json(
          { error: "Path is not a file" },
          { status: 400 }
        );
      }

      fileData = {
        content: Buffer.from(data.content, "base64").toString("utf-8"),
        sha: data.sha,
        encoding: data.encoding,
        size: data.size,
      };
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        );
      }
      if (err.status === 403) {
        const rateLimit = getLastRateLimit();
        return NextResponse.json(
          { error: "Rate limit exceeded", rateLimit },
          { status: 429 }
        );
      }
      throw error;
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

    // For binary files (image, pdf, video), re-fetch as raw and return base64
    if (fileType === "image" || fileType === "pdf" || fileType === "video") {
      // Re-fetch with mediaType for raw content
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: fullPath,
        ref: effectiveBranch,
      });

      if (Array.isArray(data) || data.type !== "file") {
        return NextResponse.json(
          { error: "Path is not a file" },
          { status: 400 }
        );
      }

      const mimeType = getMimeType(path);

      return NextResponse.json({
        path,
        content: data.content, // Already base64
        sha: data.sha,
        mimeType,
        fileType,
        rateLimit: getLastRateLimit(),
      });
    }

    // For other files (canvas, json, etc.), return raw content
    return NextResponse.json({
      path,
      content: fileData.content,
      sha: fileData.sha,
      fileType,
      rateLimit,
    });
  } catch (error: unknown) {
    console.error("Error fetching temp vault file:", error);
    const err = error as { status?: number; message?: string };

    if (err.status === 403) {
      const rateLimit = getLastRateLimit();
      return NextResponse.json(
        { error: "Rate limit exceeded", rateLimit },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to fetch file" },
      { status: 500 }
    );
  }
}
