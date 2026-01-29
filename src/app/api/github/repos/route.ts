import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getLastRateLimit } from "@/lib/github";

interface SimplifiedRepo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  default_branch: string;
  owner: { login: string };
  isOrg?: boolean;
}

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
    const { data: userRepos } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      affiliation: "owner,collaborator",
    });

    // Get user's organizations
    const { data: orgs } = await octokit.orgs.listForAuthenticatedUser({
      per_page: 100,
    });

    console.log("[GitHub Repos API] Found orgs:", orgs.map(o => o.login));

    // Fetch repos from each organization (in parallel)
    const orgReposPromises = orgs.map(async (org) => {
      try {
        const { data: repos } = await octokit.repos.listForOrg({
          org: org.login,
          sort: "updated",
          per_page: 50,
          type: "all", // Get all repos user has access to
        });
        console.log(`[GitHub Repos API] Org ${org.login}: found ${repos.length} repos`);
        return repos.map((repo) => ({ ...repo, isOrg: true }));
      } catch (err) {
        // Skip orgs where we can't list repos
        console.log(`[GitHub Repos API] Org ${org.login}: error`, err);
        return [];
      }
    });

    const orgReposArrays = await Promise.all(orgReposPromises);
    const orgRepos = orgReposArrays.flat();
    console.log("[GitHub Repos API] Total org repos:", orgRepos.length);

    // Combine and deduplicate by full_name
    const allRepos = [...userRepos, ...orgRepos];
    const seen = new Set<string>();
    const uniqueRepos = allRepos.filter((repo) => {
      if (seen.has(repo.full_name)) return false;
      seen.add(repo.full_name);
      return true;
    });

    // Sort by updated_at
    uniqueRepos.sort((a, b) => {
      const dateA = new Date(a.updated_at || 0).getTime();
      const dateB = new Date(b.updated_at || 0).getTime();
      return dateB - dateA;
    });

    // Map to simpler format
    const simplifiedRepos: SimplifiedRepo[] = uniqueRepos.slice(0, 100).map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || null,
      private: repo.private,
      stargazers_count: repo.stargazers_count ?? 0,
      default_branch: repo.default_branch ?? "main",
      owner: {
        login: repo.owner.login,
      },
      isOrg: "isOrg" in repo ? repo.isOrg : false,
    }));

    return NextResponse.json({
      repos: simplifiedRepos,
      organizations: orgs.map((o) => ({ login: o.login, avatar_url: o.avatar_url })),
      rateLimit: getLastRateLimit(),
      // Debug info
      debug: {
        userReposCount: userRepos.length,
        orgReposCount: orgRepos.length,
        totalUniqueCount: simplifiedRepos.length,
        orgsFound: orgs.map(o => o.login),
      },
    });
  } catch (error) {
    console.error("Failed to fetch repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
