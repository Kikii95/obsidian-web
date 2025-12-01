import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getFileContent, saveFileContent } from "@/lib/github";

// Separate settings files for desktop and mobile
const SETTINGS_PATH_DESKTOP = ".obsidian-web/settings-desktop.json";
const SETTINGS_PATH_MOBILE = ".obsidian-web/settings-mobile.json";

function getSettingsPath(isMobile: boolean): string {
  return isMobile ? SETTINGS_PATH_MOBILE : SETTINGS_PATH_DESKTOP;
}

/**
 * GET - Read settings from GitHub
 * Query params: ?mobile=true for mobile settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isMobile = searchParams.get("mobile") === "true";
    const settingsPath = getSettingsPath(isMobile);

    const octokit = createOctokit(session.accessToken);

    try {
      const { content, sha } = await getFileContent(octokit, settingsPath);
      const settings = JSON.parse(content);

      return NextResponse.json({
        settings,
        sha,
        exists: true,
        deviceType: isMobile ? "mobile" : "desktop",
      });
    } catch (error: unknown) {
      // File doesn't exist yet - that's OK
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        return NextResponse.json({
          settings: null,
          sha: null,
          exists: false,
          deviceType: isMobile ? "mobile" : "desktop",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture des paramètres" },
      { status: 500 }
    );
  }
}

/**
 * POST - Save settings to GitHub
 * Body: { settings, sha, mobile: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { settings, sha, mobile } = body;
    const isMobile = mobile === true;
    const settingsPath = getSettingsPath(isMobile);

    if (!settings) {
      return NextResponse.json({ error: "Settings requis" }, { status: 400 });
    }

    const octokit = createOctokit(session.accessToken);

    // Format JSON nicely for readability in GitHub
    const content = JSON.stringify(settings, null, 2);

    const result = await saveFileContent(
      octokit,
      settingsPath,
      content,
      sha || undefined,
      `Update Obsidian Web settings (${isMobile ? "mobile" : "desktop"})`
    );

    return NextResponse.json({
      success: true,
      sha: result.sha,
      deviceType: isMobile ? "mobile" : "desktop",
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des paramètres" },
      { status: 500 }
    );
  }
}
