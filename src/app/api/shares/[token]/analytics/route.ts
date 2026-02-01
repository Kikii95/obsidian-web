import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { getShareByTokenRaw } from "@/lib/shares/queries";
import { getShareAnalytics } from "@/lib/shares/analytics";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/shares/[token]/analytics - Get analytics for a specific share
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { token } = await params;
    const { session } = context;

    // Get share and verify ownership
    const share = await getShareByTokenRaw(token);

    if (!share) {
      return NextResponse.json({ error: "Partage non trouvé" }, { status: 404 });
    }

    if (share.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Get days param (default 30)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);

    const analytics = await getShareAnalytics(share.id, days);

    return NextResponse.json({
      share: {
        token: share.token,
        name: share.name,
        folderPath: share.folderPath,
        mode: share.mode,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        accessCount: share.accessCount,
      },
      analytics,
    });
  } catch (error) {
    console.error("Error fetching share analytics:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des analytics" },
      { status: 500 }
    );
  }
}
