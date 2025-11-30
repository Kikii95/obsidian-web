import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit } from "@/lib/github";

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
  authorAvatar?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Le paramètre 'path' est requis" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);

    const owner = process.env.GITHUB_REPO_OWNER!;
    const repo = process.env.GITHUB_REPO_NAME!;

    // Get commits for this file
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      path,
      per_page: 20, // Limit to last 20 commits
    });

    const history: CommitInfo[] = commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author?.date || commit.commit.committer?.date || "",
      author: commit.commit.author?.name || commit.author?.login || "Unknown",
      authorAvatar: commit.author?.avatar_url,
    }));

    return NextResponse.json({
      history,
      count: history.length,
      path,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique" },
      { status: 500 }
    );
  }
}
