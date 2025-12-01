import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getLastRateLimit } from "@/lib/github";

interface CommitActivity {
  date: string; // YYYY-MM-DD
  count: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "365");

    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);

    // Calculate date range
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get commits from the vault repo
    const owner = process.env.GITHUB_REPO_OWNER!;
    const repo = process.env.GITHUB_REPO_NAME!;

    // Fetch commits with pagination (max 100 per page)
    const commits: Array<{ date: string }> = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Max 10 pages = 1000 commits
      const { data } = await octokit.repos.listCommits({
        owner,
        repo,
        since: since.toISOString(),
        per_page: 100,
        page,
      });

      if (data.length === 0) {
        hasMore = false;
      } else {
        for (const commit of data) {
          const date = commit.commit.committer?.date || commit.commit.author?.date;
          if (date) {
            commits.push({ date: date.split("T")[0] });
          }
        }
        page++;
        if (data.length < 100) hasMore = false;
      }
    }

    // Aggregate by date
    const activityMap = new Map<string, number>();

    for (const commit of commits) {
      const current = activityMap.get(commit.date) || 0;
      activityMap.set(commit.date, current + 1);
    }

    // Convert to array sorted by date
    const activity: CommitActivity[] = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate stats
    const totalCommits = commits.length;
    const activeDays = activityMap.size;
    const maxCommitsPerDay = Math.max(...Array.from(activityMap.values()), 0);
    const avgCommitsPerDay = activeDays > 0 ? totalCommits / activeDays : 0;

    // Get streak (consecutive days with commits)
    let currentStreak = 0;
    let longestStreak = 0;
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
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'activité" },
      { status: 500 }
    );
  }
}
