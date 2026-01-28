import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { createShare, listUserShares } from "@/lib/shares/queries";
import type { CreateShareInput } from "@/types/shares";

/**
 * POST /api/shares - Create a new share
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { session, vaultConfig } = context;
    const body = (await request.json()) as CreateShareInput;

    // Validate required fields
    if (!body.folderPath || !body.expiresIn) {
      return NextResponse.json(
        { error: "folderPath et expiresIn sont requis" },
        { status: 400 }
      );
    }

    // Create the share
    const share = await createShare({
      userId: session.user.id,
      username: session.user.username,
      accessToken: session.accessToken,
      owner: vaultConfig.owner,
      repo: vaultConfig.repo,
      branch: vaultConfig.branch,
      rootPath: vaultConfig.rootPath ?? "",
      shareType: body.shareType ?? "folder",
      folderPath: body.folderPath,
      name: body.name,
      includeSubfolders: body.shareType === "note" ? false : (body.includeSubfolders ?? true),
      expiresIn: body.expiresIn,
      mode: body.mode ?? "reader",
      depositConfig: body.depositConfig,
    });

    // Return share info (without encrypted token)
    return NextResponse.json({
      success: true,
      share: {
        token: share.token,
        shareType: share.shareType,
        folderPath: share.folderPath,
        includeSubfolders: share.includeSubfolders,
        mode: share.mode,
        expiresAt: share.expiresAt.toISOString(),
        createdAt: share.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating share:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du partage" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shares - List user's shares
 */
export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { session } = context;
    const shares = await listUserShares(session.user.id);

    // Return shares without encrypted tokens
    const safeShares = shares.map((share) => {
      const folderName = share.folderPath.split("/").pop() || share.folderPath;
      return {
        token: share.token,
        shareType: share.shareType,
        folderPath: share.folderPath,
        folderName,
        name: share.name || folderName, // Use custom name or default to folder/note name
        includeSubfolders: share.includeSubfolders,
        mode: share.mode,
        expiresAt: share.expiresAt.toISOString(),
        createdAt: share.createdAt.toISOString(),
        accessCount: share.accessCount,
        isExpired: share.expiresAt < new Date(),
      };
    });

    return NextResponse.json({ shares: safeShares });
  } catch (error) {
    console.error("Error listing shares:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des partages" },
      { status: 500 }
    );
  }
}
