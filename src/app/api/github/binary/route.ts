import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getLastRateLimit } from "@/lib/github";
import { getMimeType } from "@/lib/file-types";

const REPO_OWNER = process.env.GITHUB_REPO_OWNER!;
const REPO_NAME = process.env.GITHUB_REPO_NAME!;
const BRANCH = process.env.GITHUB_BRANCH || "master";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path requis" }, { status: 400 });
    }

    const octokit = createOctokit(session.accessToken);

    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
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
