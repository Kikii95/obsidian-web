import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-vault-config";
import { getUserSharesAnalytics } from "@/lib/shares/analytics";

/**
 * GET /api/shares/analytics - Get aggregated analytics for all user shares
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { session } = context;
    const userId = session.user.id;

    // Get days param (default 30)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);

    const analytics = await getUserSharesAnalytics(userId, days);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching share analytics:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des analytics",
        details: error instanceof Error ? error.message : "Erreur inconnue",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
