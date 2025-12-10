import { NextRequest, NextResponse } from "next/server";
import { getLastRateLimit, createOctokit } from "@/lib/github";
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

    return NextResponse.json({
      path,
      content: data.content, // base64 encoded
      sha: data.sha,
      size: data.size,
      mimeType,
      encoding: data.encoding,
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
