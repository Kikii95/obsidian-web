import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { getShareMetadata } from "@/lib/server-share-context";
import { deleteShare, getShareByTokenRaw, updateShareName } from "@/lib/shares/queries";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/shares/[token] - Get share metadata (public)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const metadata = await getShareMetadata(token);

    if (!metadata) {
      // Check if share exists but is expired
      const share = await getShareByTokenRaw(token);
      if (share && share.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Ce lien de partage a expiré", expired: true },
          { status: 410 }
        );
      }
      return NextResponse.json(
        { error: "Partage non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ share: metadata });
  } catch (error) {
    console.error("Error getting share metadata:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du partage" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shares/[token] - Revoke a share (requires auth)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { token } = await params;
    const { session } = context;
    const deleted = await deleteShare(token, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Partage non trouvé ou non autorisé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting share:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du partage" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shares/[token] - Update share name (requires auth)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { token } = await params;
    const { session } = context;
    const body = await request.json();

    if (typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Le champ 'name' est requis" },
        { status: 400 }
      );
    }

    const updated = await updateShareName(token, session.user.id, body.name);

    if (!updated) {
      return NextResponse.json(
        { error: "Partage non trouvé ou non autorisé" },
        { status: 404 }
      );
    }

    const folderName = updated.folderPath.split("/").pop() || updated.folderPath;

    return NextResponse.json({
      success: true,
      share: {
        token: updated.token,
        name: updated.name || folderName,
        folderName,
      },
    });
  } catch (error) {
    console.error("Error updating share:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du partage" },
      { status: 500 }
    );
  }
}
