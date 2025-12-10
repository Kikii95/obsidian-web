import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit } from "@/lib/github";

// Path where vault config is stored in user's GitHub account
// This is stored in a special config repo, not the vault itself
const CONFIG_REPO = ".obsidian-web-config";
const CONFIG_FILE = "vault-config.json";

interface VaultConfigData {
  owner: string;
  repo: string;
  branch: string;
  configuredAt: string;
}

/**
 * GET /api/vault-config
 * Retrieve user's vault configuration
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session?.user?.username) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);
    const username = session.user.username;

    try {
      // Try to get config from user's config repo
      const { data } = await octokit.repos.getContent({
        owner: username,
        repo: CONFIG_REPO,
        path: CONFIG_FILE,
      });

      if (Array.isArray(data) || data.type !== "file") {
        return NextResponse.json({ config: null, exists: false });
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const config = JSON.parse(content) as VaultConfigData;

      return NextResponse.json({
        config,
        exists: true,
        sha: data.sha,
      });
    } catch (error: unknown) {
      // Repo or file doesn't exist
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        return NextResponse.json({ config: null, exists: false });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading vault config:", error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture de la configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vault-config
 * Save user's vault configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session?.user?.username) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, branch = "main" } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner et repo sont requis" },
        { status: 400 }
      );
    }

    const octokit = createOctokit(session.accessToken);
    const username = session.user.username;

    // First, ensure config repo exists
    try {
      await octokit.repos.get({
        owner: username,
        repo: CONFIG_REPO,
      });
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        // Create the config repo
        await octokit.repos.createForAuthenticatedUser({
          name: CONFIG_REPO,
          description: "Configuration for Obsidian Web",
          private: true,
          auto_init: true,
        });
        // Wait a bit for repo to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }

    // Prepare config data
    const configData: VaultConfigData = {
      owner,
      repo,
      branch,
      configuredAt: new Date().toISOString(),
    };

    // Try to get existing file SHA
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: username,
        repo: CONFIG_REPO,
        path: CONFIG_FILE,
      });
      if (!Array.isArray(data) && data.type === "file") {
        sha = data.sha;
      }
    } catch {
      // File doesn't exist, that's ok
    }

    // Save config file
    await octokit.repos.createOrUpdateFileContents({
      owner: username,
      repo: CONFIG_REPO,
      path: CONFIG_FILE,
      message: "Update Obsidian Web vault configuration",
      content: Buffer.from(JSON.stringify(configData, null, 2)).toString("base64"),
      sha,
    });

    return NextResponse.json({
      success: true,
      config: configData,
    });
  } catch (error) {
    console.error("Error saving vault config:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde de la configuration" },
      { status: 500 }
    );
  }
}
