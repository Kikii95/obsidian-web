import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import {
  getCommitActivity,
  hasCommitActivity,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

interface CommitActivityResponse {
  date: string;
  count: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "365");

    const session = await getServerSession(authOptions);
    const context = await getAuthenticatedContext();

    if (!context || !session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;

    const vaultKey: VaultKey = {
      userId: session.user.id || session.user.email || "",
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };

    // Try to get from PostgreSQL first (populated during indexing)
    const hasData = await hasCommitActivity(vaultKey);

    if (hasData) {
      // Read from PostgreSQL - fast!
      const dbActivity = await getCommitActivity(vaultKey, days);

      const activity: CommitActivityResponse[] = dbActivity.map((a) => ({
        date: a.date,
        count: a.count,
      }));

      const stats = calculateStats(activity, days);

      return NextResponse.json({
        activity,
        stats,
        rateLimit: getLastRateLimit(),
        source: "postgresql",
      });
    }

    // Fallback to GitHub API if no data in PostgreSQL
    return await fetchFromGitHub(octokit, vaultConfig.owner, vaultConfig.repo, days);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Activity] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de l'activité",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Fallback using GitHub API
async function fetchFromGitHub(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  octokit: any,
  owner: string,
  repo: string,
  days: number
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activityMap = new Map<string, number>();
  let page = 1;
  const perPage = 100;
  const maxPages = 30;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      since: since.toISOString(),
      per_page: perPage,
      page,
    });

    if (data.length === 0) {
      hasMore = false;
      break;
    }

    for (const commit of data) {
      const date = commit.commit.author?.date;
      if (date) {
        const dateStr = date.split("T")[0];
        activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
      }
    }

    if (data.length < perPage) {
      hasMore = false;
    }

    page++;
  }

  const activity: CommitActivityResponse[] = Array.from(activityMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const stats = calculateStats(activity, days);

  return NextResponse.json({
    activity,
    stats,
    rateLimit: getLastRateLimit(),
    source: "github_api",
    pagesUsed: page - 1,
  });
}

// Calculate streak and other stats
function calculateStats(activity: CommitActivityResponse[], days: number) {
  const activityMap = new Map(activity.map((a) => [a.date, a.count]));

  let totalCommits = 0;
  for (const a of activity) {
    totalCommits += a.count;
  }

  const activeDays = activityMap.size;
  const maxCommitsPerDay = Math.max(...activity.map((a) => a.count), 0);
  const avgCommitsPerDay = activeDays > 0 ? totalCommits / activeDays : 0;

  // Current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split("T")[0];
  const sortedDates = Array.from(activityMap.keys()).sort().reverse();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = new Date(sortedDates[i]);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (date.toISOString().split("T")[0] === expectedDate.toISOString().split("T")[0]) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest streak
  let streak = 0;
  let longestStreak = 0;
  const allDates = Array.from(activityMap.keys()).sort();
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        streak++;
      } else {
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  return {
    totalCommits,
    activeDays,
    maxCommitsPerDay,
    avgCommitsPerDay: Math.round(avgCommitsPerDay * 10) / 10,
    currentStreak,
    longestStreak,
    period: days,
  };
}
