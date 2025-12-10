import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, type VaultConfig } from "@/lib/github";

// Config repo where user's vault config is stored
const CONFIG_REPO = ".obsidian-web-config";
const CONFIG_FILE = "vault-config.json";

interface VaultConfigData {
  owner: string;
  repo: string;
  branch: string;
  rootPath?: string;
}

/**
 * Get vault config for the current user (server-side)
 *
 * Priority:
 * 1. User's GitHub config repo (.obsidian-web-config/vault-config.json)
 * 2. Environment variables (for backward compatibility / single-user mode)
 */
export async function getServerVaultConfig(): Promise<VaultConfig | null> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.user?.username) {
    return null;
  }

  // First, try to get from user's config repo
  try {
    const octokit = createOctokit(session.accessToken);
    const username = session.user.username;

    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: CONFIG_REPO,
      path: CONFIG_FILE,
    });

    if (!Array.isArray(data) && data.type === "file") {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const config = JSON.parse(content) as VaultConfigData;

      return {
        owner: config.owner,
        repo: config.repo,
        branch: config.branch || "main",
        rootPath: config.rootPath || "",
      };
    }
  } catch {
    // Config repo doesn't exist, fall back to env vars
  }

  // Fall back to environment variables (single-user mode / backward compatibility)
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_BRANCH || "main";
  const rootPath = process.env.GITHUB_ROOT_PATH || "";

  if (owner && repo) {
    return { owner, repo, branch, rootPath };
  }

  return null;
}

/**
 * Helper to get session, octokit, and vault config in one call
 * Returns null if any of them is missing
 */
export async function getAuthenticatedContext() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return null;
  }

  const vaultConfig = await getServerVaultConfig();

  if (!vaultConfig) {
    return null;
  }

  const octokit = createOctokit(session.accessToken);

  return {
    session,
    octokit,
    vaultConfig,
  };
}
