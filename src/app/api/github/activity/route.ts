import { NextResponse } from "next/server";
import { getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

interface CommitActivity {
  date: string; // YYYY-MM-DD
  count: number;
}

interface WeeklyStats {
  week: number; // Unix timestamp
  days: number[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  total: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "365");

    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;

    const owner = vaultConfig.owner;
    const repo = vaultConfig.repo;

    // Try GitHub Stats API first - returns 52 weeks of data in a single call
    let weeklyStats: WeeklyStats[] = [];
    let usedFallback = false;

    try {
      const response = await octokit.repos.getCommitActivityStats({
        owner,
        repo,
      });

      // GitHub may return 202 if stats are being computed
      if (response.status === 202) {
        console.log("[Activity] Stats computing, using fallback...");
        usedFallback = true;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        weeklyStats = response.data as WeeklyStats[];
      } else {
        console.log("[Activity] Stats empty, using fallback...");
        usedFallback = true;
      }
    } catch (statsError) {
      console.log("[Activity] Stats API failed, using fallback:", statsError);
      usedFallback = true;
    }

    // Fallback to listCommits if stats unavailable
    if (usedFallback || weeklyStats.length === 0) {
      return await fetchWithListCommits(octokit, owner, repo, days);
    }

    // Process weekly stats
    const now = new Date();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const activityMap = new Map<string, number>();
    let totalCommits = 0;

    for (const week of weeklyStats) {
      const weekStart = new Date(week.week * 1000);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayOffset);

        // Skip dates outside the requested range
        if (date < sinceDate || date > now) continue;

        const count = week.days[dayOffset];
        if (count > 0) {
          const dateStr = date.toISOString().split("T")[0];
          activityMap.set(dateStr, count);
          totalCommits += count;
        }
      }
    }

    // Convert to sorted array
    const activity: CommitActivity[] = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate stats
    const stats = calculateStats(activityMap, totalCommits, days);

    return NextResponse.json({
      activity,
      stats,
      rateLimit: getLastRateLimit(),
      source: "stats_api",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Activity] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de l'activité",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// Fallback using listCommits with smart pagination
async function fetchWithListCommits(
  octokit: ReturnType<typeof import("@octokit/rest").Octokit>,
  owner: string,
  repo: string,
  days: number
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activityMap = new Map<string, number>();
  let page = 1;
  const perPage = 100;
  const maxPages = 30; // 3000 commits max to avoid rate limits
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

    // If we got less than perPage, we're done
    if (data.length < perPage) {
      hasMore = false;
    }

    page++;
  }

  let totalCommits = 0;
  for (const count of activityMap.values()) {
    totalCommits += count;
  }

  const activity: CommitActivity[] = Array.from(activityMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const stats = calculateStats(activityMap, totalCommits, days);

  return NextResponse.json({
    activity,
    stats,
    rateLimit: getLastRateLimit(),
    source: "list_commits",
    pagesUsed: page - 1,
  });
}

// Calculate streak and other stats
function calculateStats(
  activityMap: Map<string, number>,
  totalCommits: number,
  days: number
) {
  const activeDays = activityMap.size;
  const maxCommitsPerDay = Math.max(...Array.from(activityMap.values()), 0);
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
