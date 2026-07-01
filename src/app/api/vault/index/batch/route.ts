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

// Index a list of files, retrying transient failures once before giving up so a
// rate-limit blip doesn't silently drop notes from the index.
async function indexBatch(
  octokit: Parameters<typeof indexNoteFile>[0],
  vaultConfig: Parameters<typeof indexNoteFile>[1],
  vaultKey: VaultKey,
  files: IndexableFile[]
): Promise<{ indexed: number; failed: number }> {
  const failedFirstPass: IndexableFile[] = [];
  let indexed = 0;

  for (const file of files) {
    try {
      await indexNoteFile(octokit, vaultConfig, vaultKey, file);
      indexed += 1;
    } catch (error) {
      console.error(`Failed to index ${file.path}:`, error);
      failedFirstPass.push(file);
    }
  }

  let failed = 0;
  for (const file of failedFirstPass) {
    try {
      await indexNoteFile(octokit, vaultConfig, vaultKey, file);
      indexed += 1;
    } catch (error) {
      console.error(`Retry failed for ${file.path}:`, error);
      failed += 1;
    }
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
