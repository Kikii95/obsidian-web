import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import {
  getVaultIndexStatus,
  getAllVaultIndexEntries,
  type VaultKey,
} from "@/lib/db/vault-index-queries";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const context = await getAuthenticatedContext();

    if (!context || !session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { vaultConfig } = context;

    const vaultKey: VaultKey = {
      userId: session.user.id || session.user.email || "",
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };

    const status = await getVaultIndexStatus(vaultKey);

    if (!status) {
      return NextResponse.json({
        status: "none",
        hasIndex: false,
        totalFiles: 0,
        indexedFiles: 0,
        failedFiles: 0,
        startedAt: null,
        completedAt: null,
      });
    }

    // If completed, get actual indexed count
    let actualIndexedCount = status.indexedFiles;
    if (status.status === "completed") {
      const entries = await getAllVaultIndexEntries(vaultKey);
      actualIndexedCount = entries.length;
    }

    return NextResponse.json({
      status: status.status,
      hasIndex: status.status === "completed" && actualIndexedCount > 0,
      totalFiles: status.totalFiles,
      indexedFiles: actualIndexedCount,
      failedFiles: status.failedFiles,
      startedAt: status.startedAt,
      completedAt: status.completedAt,
      errorMessage: status.errorMessage,
    });
  } catch (error) {
    console.error("Error getting index status:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du statut" },
      { status: 500 }
    );
  }
}
