import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { getFullVaultTree } from "@/lib/github";
import { filterPrivatePaths } from "@/lib/privacy";
import {
  getVaultIndexStatus,
  startIndexing,
  deleteAllVaultIndexEntries,
  getVaultIndexShas,
  deleteVaultIndexEntries,
  upsertCommitActivity,
  deleteAllCommitActivity,
  type VaultKey,
  type CommitActivityData,
} from "@/lib/db/vault-index-queries";

// Helper to fetch and store commit activity during indexing
async function syncCommitActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  octokit: any,
  vaultKey: VaultKey,
  owner: string,
  repo: string
): Promise<{ synced: number }> {
  try {
    const activityMap = new Map<string, number>();
    let page = 1;
    const perPage = 100;
    const maxPages = 30; // 3000 commits max
    let hasMore = true;

    // Fetch last 365 days
    const since = new Date();
    since.setDate(since.getDate() - 365);

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

    // Convert to array and store
    const activities: CommitActivityData[] = Array.from(activityMap.entries()).map(
      ([date, count]) => ({ date, count })
    );

    await upsertCommitActivity(vaultKey, activities);

    return { synced: activities.length };
  } catch (error) {
    console.error("[Index] Error syncing commit activity:", error);
    return { synced: 0 };
  }
}

export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { session, vaultConfig } = context;

    const vaultKey: VaultKey = {
      userId: session.user?.id || session.user?.email || "",
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };

    const status = await getVaultIndexStatus(vaultKey);

    return NextResponse.json({
      status: status?.status || "none",
      totalFiles: status?.totalFiles || 0,
      indexedFiles: status?.indexedFiles || 0,
      failedFiles: status?.failedFiles || 0,
      startedAt: status?.startedAt,
      completedAt: status?.completedAt,
    });
  } catch (error) {
    console.error("Error getting index status:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du statut" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { rebuild = false } = await request.json().catch(() => ({}));

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

    // Check if already indexing
    const currentStatus = await getVaultIndexStatus(vaultKey);
    if (currentStatus?.status === "indexing" && !rebuild) {
      return NextResponse.json({
        status: "already_indexing",
        message: "Indexation déjà en cours",
        progress: {
          indexed: currentStatus.indexedFiles,
          total: currentStatus.totalFiles,
        },
      });
    }

    // Sync commit activity in background (non-blocking)
    const commitSyncPromise = syncCommitActivity(
      octokit,
      vaultKey,
      vaultConfig.owner,
      vaultConfig.repo
    );

    // Get all markdown files from GitHub
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);
    const publicFiles = filterPrivatePaths(allFiles);
    const mdFiles = publicFiles.filter(
      (f) => f.type === "file" && f.path.endsWith(".md")
    );

    // Create a map of current GitHub files
    const githubFilesMap = new Map(mdFiles.map((f) => [f.path, f.sha]));

    // If rebuild, clear existing index and index all files
    if (rebuild) {
      await deleteAllVaultIndexEntries(vaultKey);
      await deleteAllCommitActivity(vaultKey); // Clear old commit data too

      await startIndexing(vaultKey, mdFiles.length);

      // Wait for commit sync to complete
      const commitSync = await commitSyncPromise;

      return NextResponse.json({
        status: "started",
        mode: "rebuild",
        totalFiles: mdFiles.length,
        newFiles: mdFiles.length,
        modifiedFiles: 0,
        deletedFiles: 0,
        unchangedFiles: 0,
        commitActivitySynced: commitSync.synced,
        files: mdFiles.map((f) => ({
          path: f.path,
          name: f.name,
          sha: f.sha,
        })),
      });
    }

    // SMART REFRESH: Compare SHA to find changes
    const existingShas = await getVaultIndexShas(vaultKey);

    const newFiles: typeof mdFiles = [];
    const modifiedFiles: typeof mdFiles = [];
    const unchangedFiles: string[] = [];
    const deletedFiles: string[] = [];

    // Check each GitHub file
    for (const file of mdFiles) {
      const existingSha = existingShas.get(file.path);

      if (!existingSha) {
        // New file (not in index)
        newFiles.push(file);
      } else if (existingSha !== file.sha) {
        // Modified file (SHA changed)
        modifiedFiles.push(file);
      } else {
        // Unchanged file (same SHA)
        unchangedFiles.push(file.path);
      }
    }

    // Check for deleted files (in index but not in GitHub)
    for (const [indexedPath] of existingShas) {
      if (!githubFilesMap.has(indexedPath)) {
        deletedFiles.push(indexedPath);
      }
    }

    // Delete removed files from index
    if (deletedFiles.length > 0) {
      await deleteVaultIndexEntries(vaultKey, deletedFiles);
    }

    // Files to process = new + modified
    const filesToProcess = [...newFiles, ...modifiedFiles];

    // If nothing to process, return immediately
    if (filesToProcess.length === 0) {
      // Still wait for commit sync even if no file changes
      const commitSync = await commitSyncPromise;

      return NextResponse.json({
        status: "completed",
        mode: "refresh",
        message: "Index déjà à jour",
        totalFiles: mdFiles.length,
        newFiles: 0,
        modifiedFiles: 0,
        deletedFiles: deletedFiles.length,
        unchangedFiles: unchangedFiles.length,
        commitActivitySynced: commitSync.synced,
        files: [],
      });
    }

    // Start indexing only for files that need it
    await startIndexing(vaultKey, filesToProcess.length);

    // Wait for commit sync to complete
    const commitSync = await commitSyncPromise;

    return NextResponse.json({
      status: "started",
      mode: "refresh",
      totalFiles: mdFiles.length,
      newFiles: newFiles.length,
      modifiedFiles: modifiedFiles.length,
      deletedFiles: deletedFiles.length,
      unchangedFiles: unchangedFiles.length,
      commitActivitySynced: commitSync.synced,
      files: filesToProcess.map((f) => ({
        path: f.path,
        name: f.name,
        sha: f.sha,
      })),
    });
  } catch (error) {
    console.error("Error starting indexation:", error);
    return NextResponse.json(
      { error: "Erreur lors du démarrage de l'indexation" },
      { status: 500 }
    );
  }
}
