import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { indexNoteFile, type IndexableFile } from "@/lib/vault-indexer";
import {
  updateIndexingProgress,
  completeIndexing,
  failIndexing,
  getVaultIndexStatus,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

interface BatchRequest {
  files: IndexableFile[];
  totalFiles: number;
  currentIndex: number;
}

// Serverless functions default to a short timeout; a batch of GitHub fetches +
// DB writes needs headroom (Vercel Hobby allows up to 60s).
export const maxDuration = 60;

// Index a batch's files concurrently (fast, avoids timeouts), then retry the
// transient failures once so a rate-limit blip doesn't drop notes.
async function indexBatch(
  octokit: Parameters<typeof indexNoteFile>[0],
  vaultConfig: Parameters<typeof indexNoteFile>[1],
  vaultKey: VaultKey,
  files: IndexableFile[]
): Promise<{ indexed: number; failed: number }> {
  const first = await Promise.allSettled(
    files.map((file) => indexNoteFile(octokit, vaultConfig, vaultKey, file))
  );
  const retryFiles = files.filter((_, i) => first[i].status === "rejected");
  first.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`Failed to index ${files[i].path}:`, result.reason);
    }
  });

  let indexed = files.length - retryFiles.length;
  let failed = 0;
  if (retryFiles.length > 0) {
    const retry = await Promise.allSettled(
      retryFiles.map((file) => indexNoteFile(octokit, vaultConfig, vaultKey, file))
    );
    retry.forEach((result, i) => {
      if (result.status === "fulfilled") {
        indexed += 1;
      } else {
        failed += 1;
        console.error(`Retry failed for ${retryFiles[i].path}:`, result.reason);
      }
    });
  }

  return { indexed, failed };
}

export async function POST(request: Request) {
  try {
    const body: BatchRequest = await request.json();
    const { files, totalFiles, currentIndex } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "Fichiers manquants" }, { status: 400 });
    }

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

    const { indexed, failed } = await indexBatch(octokit, vaultConfig, vaultKey, files);

    const processedSoFar = currentIndex + indexed + failed;
    const isComplete = processedSoFar >= totalFiles;

    const status = await getVaultIndexStatus(vaultKey);
    const totalIndexed = (status?.indexedFiles || 0) + indexed;
    const totalFailed = (status?.failedFiles || 0) + failed;

    if (isComplete) {
      await completeIndexing(vaultKey, totalIndexed, totalFailed);
    } else {
      await updateIndexingProgress(vaultKey, totalIndexed, totalFailed);
    }

    return NextResponse.json({
      status: isComplete ? "completed" : "in_progress",
      indexed,
      failed,
      totalIndexed,
      totalFiles,
      isComplete,
    });
  } catch (error) {
    console.error("Error processing batch:", error);
    await markBatchFailed(error).catch(() => {});
    return NextResponse.json(
      { error: "Erreur lors du traitement du batch" },
      { status: 500 }
    );
  }
}

async function markBatchFailed(error: unknown): Promise<void> {
  const session = await getServerSession(authOptions);
  const context = await getAuthenticatedContext();
  if (!context || !session?.user) return;
  const vaultKey: VaultKey = {
    userId: session.user.id || session.user.email || "",
    owner: context.vaultConfig.owner,
    repo: context.vaultConfig.repo,
    branch: context.vaultConfig.branch,
  };
  await failIndexing(vaultKey, String(error));
}
