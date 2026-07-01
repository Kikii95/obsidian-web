import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import type { VaultKey } from "@/lib/db/vault-index-queries";
import { getNeighborhoodForVault, parseGraphOptions } from "@/lib/graph/graph-service";

const MAX_DEPTH = 2;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const context = await getAuthenticatedContext();
    if (!context || !session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const node = searchParams.get("node");
    if (!node) {
      return NextResponse.json({ error: "Paramètre 'node' requis" }, { status: 400 });
    }
    const depth = Math.min(Math.max(Number(searchParams.get("depth")) || 1, 1), MAX_DEPTH);
    const { vaultConfig } = context;
    const vaultKey: VaultKey = {
      userId: session.user.id || session.user.email || "",
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };
    const graph = await getNeighborhoodForVault(vaultKey, node, depth, parseGraphOptions(searchParams));
    return NextResponse.json(graph);
  } catch (error) {
    console.error("Error expanding graph:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'expansion du graphe" },
      { status: 500 }
    );
  }
}
