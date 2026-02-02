import { NextResponse } from "next/server";
import { getFullVaultTree, getLastRateLimit } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { isPrivatePath } from "@/lib/privacy";
import { buildTree } from "@/lib/tree-utils";
import type { VaultFile } from "@/types";

export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { octokit, vaultConfig } = context;
    const allFiles = await getFullVaultTree(octokit, false, vaultConfig);

    // Build tree structure with privacy lock status
    const tree = buildTree(allFiles, isPrivatePath);

    // Include rate limit info in response
    const rateLimit = getLastRateLimit();

    return NextResponse.json({ tree, rateLimit });
  } catch (error) {
    console.error("Error fetching vault tree:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du vault" },
      { status: 500 }
    );
  }
}
