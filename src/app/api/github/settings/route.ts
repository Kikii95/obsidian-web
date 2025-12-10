import { NextRequest, NextResponse } from "next/server";
import { getFileContent, saveFileContent } from "@/lib/github";
import { getAuthenticatedContext } from "@/lib/server-vault-config";

// Separate settings files for desktop and mobile
const SETTINGS_PATH_DESKTOP = ".obsidian-web/settings-desktop.json";
const SETTINGS_PATH_MOBILE = ".obsidian-web/settings-mobile.json";

// Settings that are shared between desktop and mobile
const SHARED_SETTINGS_KEYS = [
  "customFolderOrders",
  "pinHash",
  "dailyNotesFolder",
  "theme",
  "vaultRootPath",
  "hidePatterns",
] as const;

function getSettingsPath(isMobile: boolean): string {
  return isMobile ? SETTINGS_PATH_MOBILE : SETTINGS_PATH_DESKTOP;
}

function getOtherSettingsPath(isMobile: boolean): string {
  return isMobile ? SETTINGS_PATH_DESKTOP : SETTINGS_PATH_MOBILE;
}

// Extract shared settings from a settings object
function extractSharedSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const shared: Record<string, unknown> = {};
  for (const key of SHARED_SETTINGS_KEYS) {
    if (key in settings) {
      shared[key] = settings[key];
    }
  }
  return shared;
}

/**
 * GET - Read settings from GitHub
 * Query params: ?mobile=true for mobile settings
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isMobile = searchParams.get("mobile") === "true";
    const settingsPath = getSettingsPath(isMobile);

    const { octokit, vaultConfig } = context;

    try {
      const { content, sha } = await getFileContent(octokit, settingsPath, vaultConfig);
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
 * Also syncs shared settings (customFolderOrders, pinHash, dailyNotesFolder) to the other device file
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext();

    if (!context) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { settings, sha, mobile } = body;
    const isMobile = mobile === true;
    const settingsPath = getSettingsPath(isMobile);
    const otherSettingsPath = getOtherSettingsPath(isMobile);

    if (!settings) {
      return NextResponse.json({ error: "Settings requis" }, { status: 400 });
    }

    const { octokit, vaultConfig } = context;

    // Format JSON nicely for readability in GitHub
    const content = JSON.stringify(settings, null, 2);

    // Save current device settings
    const result = await saveFileContent(
      octokit,
      settingsPath,
      content,
      sha || undefined,
      `Update Obsidian Web settings (${isMobile ? "mobile" : "desktop"})`,
      vaultConfig
    );

    // Sync shared settings to the other device file (if it exists)
    try {
      const sharedSettings = extractSharedSettings(settings);

      // Try to read the other device's settings
      try {
        const { content: otherContent, sha: otherSha } = await getFileContent(octokit, otherSettingsPath, vaultConfig);
        const otherSettings = JSON.parse(otherContent);

        // Merge shared settings into other device's settings
        const updatedOtherSettings = { ...otherSettings, ...sharedSettings };
        const updatedContent = JSON.stringify(updatedOtherSettings, null, 2);

        // Only save if there are actual changes
        if (otherContent !== updatedContent) {
          await saveFileContent(
            octokit,
            otherSettingsPath,
            updatedContent,
            otherSha,
            `Sync shared settings from ${isMobile ? "mobile" : "desktop"}`,
            vaultConfig
          );
        }
      } catch (error: unknown) {
        // Other file doesn't exist - create it with just shared settings
        if (error && typeof error === "object" && "status" in error && error.status === 404) {
          const newContent = JSON.stringify(sharedSettings, null, 2);
          await saveFileContent(
            octokit,
            otherSettingsPath,
            newContent,
            undefined,
            `Create ${isMobile ? "desktop" : "mobile"} settings with shared values`,
            vaultConfig
          );
        }
        // Ignore other errors - syncing is best-effort
      }
    } catch {
      // Sync failed - that's OK, main save succeeded
      console.warn("Failed to sync shared settings to other device");
    }

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
