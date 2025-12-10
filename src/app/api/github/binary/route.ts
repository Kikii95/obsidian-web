import { NextRequest, NextResponse } from "next/server";
import { getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { getMimeType } from "@/lib/file-types";

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path requis" }, { status: 400 });
    }

    const { octokit, vaultConfig } = context;

    const { data } = await octokit.repos.getContent({
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      path,
      ref: vaultConfig.branch,
    });

    if (Array.isArray(data) || data.type !== "file") {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    const mimeType = getMimeType(path);
    let content: string;

    // GitHub returns base64 content for small files, but for files > 1MB
    // it only provides download_url and we need to fetch separately
    if (data.content) {
      // Clean newlines from base64 content
      content = data.content.replace(/\n/g, "");
    } else if (data.download_url) {
      // Fetch content from download_url for large files
      const response = await fetch(data.download_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      content = Buffer.from(arrayBuffer).toString("base64");
    } else {
      return NextResponse.json({ error: "No content available" }, { status: 400 });
    }

    return NextResponse.json({
      path,
      content, // base64 encoded
      sha: data.sha,
      size: data.size,
      mimeType,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Error reading binary file:", error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture du fichier" },
      { status: 500 }
    );
  }
}
