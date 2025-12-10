import { NextResponse } from "next/server";

// Fetch issues from the obsidian-web repo (public, no auth needed)
const REPO_OWNER = "Kikii95";
const REPO_NAME = "obsidian-web";

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: { name: string; color: string }[];
  created_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);
    const state = searchParams.get("state") === "closed" ? "closed" : "open";

    // Fetch issues from the public repo (no auth needed for public repos)
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=${state}&per_page=${limit}&sort=created&direction=desc`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "obsidian-web",
        },
        // Cache for 5 minutes
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      // If repo is private or doesn't exist, return empty array
      if (response.status === 404) {
        return NextResponse.json({ issues: [], total: 0 });
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const issues: GitHubIssue[] = await response.json();

    // Filter out pull requests (GitHub API returns PRs as issues too)
    const filteredIssues = issues.filter(
      (issue) => !("pull_request" in issue)
    );

    // Get total count from headers (for "View all" link)
    const linkHeader = response.headers.get("Link");
    let totalCount = filteredIssues.length;

    // Try to get total open issues count
    const repoResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "obsidian-web",
        },
        next: { revalidate: 300 },
      }
    );

    if (repoResponse.ok) {
      const repoData = await repoResponse.json();
      totalCount = repoData.open_issues_count || filteredIssues.length;
    }

    return NextResponse.json({
      issues: filteredIssues.map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
        created_at: issue.created_at,
        html_url: issue.html_url,
        user: {
          login: issue.user.login,
          avatar_url: issue.user.avatar_url,
        },
      })),
      total: totalCount,
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch issues", issues: [], total: 0 },
      { status: 500 }
    );
  }
}
