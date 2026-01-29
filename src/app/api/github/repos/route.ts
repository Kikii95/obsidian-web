import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getLastRateLimit } from "@/lib/github";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const octokit = createOctokit(session.accessToken);

    // Get user's repos (owned + collaborated)
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
      affiliation: "owner,collaborator",
    });

    // Map to simpler format
    const simplifiedRepos = repos.map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      stargazers_count: repo.stargazers_count,
      default_branch: repo.default_branch,
      owner: {
        login: repo.owner.login,
      },
    }));

    return NextResponse.json({
      repos: simplifiedRepos,
      rateLimit: getLastRateLimit(),
    });
  } catch (error) {
    console.error("Failed to fetch repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
