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
  type VaultKey,
} from "@/lib/db/vault-index-queries";

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

    // If rebuild, clear existing index
    if (rebuild) {
      await deleteAllVaultIndexEntries(vaultKey);
    }

    // Get all markdown files
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);
    const publicFiles = filterPrivatePaths(allFiles);
    const mdFiles = publicFiles.filter(
      (f) => f.type === "file" && f.path.endsWith(".md")
    );

    // Start indexing
    await startIndexing(vaultKey, mdFiles.length);

    // Return file list for batch processing
    return NextResponse.json({
      status: "started",
      totalFiles: mdFiles.length,
      files: mdFiles.map((f) => ({
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
