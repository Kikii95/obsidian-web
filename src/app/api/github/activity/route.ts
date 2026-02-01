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

    // Use GitHub Stats API - returns 52 weeks of data in a single call
    // Much more efficient than paginating through commits
    const response = await octokit.repos.getCommitActivityStats({
      owner,
      repo,
    });

    // GitHub may return 202 if stats are being computed
    if (response.status === 202) {
      return NextResponse.json({
        activity: [],
        stats: {
          totalCommits: 0,
          activeDays: 0,
          maxCommitsPerDay: 0,
          avgCommitsPerDay: 0,
          currentStreak: 0,
          longestStreak: 0,
          period: days,
        },
        rateLimit: getLastRateLimit(),
        computing: true,
        message: "Stats en cours de calcul, réessayez dans quelques secondes",
      });
    }

    const weeklyStats = response.data as WeeklyStats[];

    if (!weeklyStats || !Array.isArray(weeklyStats)) {
      throw new Error("Invalid stats response from GitHub");
    }

    // Calculate date range filter
    const now = new Date();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Convert weekly stats to daily activity
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
    const activeDays = activityMap.size;
    const maxCommitsPerDay = Math.max(...Array.from(activityMap.values()), 0);
    const avgCommitsPerDay = activeDays > 0 ? totalCommits / activeDays : 0;

    // Get streak (consecutive days with commits)
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

    // Calculate longest streak
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

    return NextResponse.json({
      activity,
      stats: {
        totalCommits,
        activeDays,
        maxCommitsPerDay,
        avgCommitsPerDay: Math.round(avgCommitsPerDay * 10) / 10,
        currentStreak,
        longestStreak,
        period: days,
      },
      rateLimit: getLastRateLimit(),
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
