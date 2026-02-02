import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { getVaultIndexStatus } from "@/lib/db/vault-index-queries";
import { parseDataviewQuery, executeDataviewQuery } from "@/lib/dataview";
import type { VaultKey } from "@/lib/db/vault-index-queries";

export async function POST(request: Request) {
  try {
    // Check auth
    const context = await getAuthenticatedContext();
    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { session, vaultConfig } = context;

    // Parse request body
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query string required" },
        { status: 400 }
      );
    }

    // Build vault key
    const vaultKey: VaultKey = {
      userId: session.user.id,
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
    };

    // Check if index exists and is ready
    const indexStatus = await getVaultIndexStatus(vaultKey);
    if (!indexStatus || indexStatus.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          error: "Index requis pour les queries Dataview. Lancez l'indexation depuis les paramètres.",
          needsIndex: true,
        },
        { status: 400 }
      );
    }

    // Parse query
    const parsed = parseDataviewQuery(query);
    if ("error" in parsed) {
      return NextResponse.json(
        {
          success: false,
          error: `Erreur de syntaxe: ${parsed.error}`,
          entries: [],
          totalCount: 0,
        },
        { status: 400 }
      );
    }

    // Execute query
    const result = await executeDataviewQuery(parsed, vaultKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Dataview query error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        entries: [],
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}
