import { createOctokit, type VaultConfig } from "@/lib/github";
import { getShareByToken, recordShareAccess } from "@/lib/shares/queries";
import { decryptToken } from "@/lib/shares/encryption";
import type { Share } from "@/lib/db/schema";
import type { Octokit } from "@octokit/rest";

export interface ShareContext {
  share: Share;
  octokit: Octokit;
  vaultConfig: VaultConfig;
}

/**
 * Get share context for public access
 * Returns null if share not found, expired, or decryption fails
 */
export async function getShareContext(
  token: string
): Promise<ShareContext | null> {
  try {
    const share = await getShareByToken(token);

    if (!share) {
      return null;
    }

    // Decrypt the GitHub token
    const accessToken = await decryptToken(share.encryptedToken);

    // Create Octokit with the owner's token
    const octokit = createOctokit(accessToken);

    // Build vault config from share data
    const vaultConfig: VaultConfig = {
      owner: share.owner,
      repo: share.repo,
      branch: share.branch,
      rootPath: share.rootPath ?? "",
    };

    // Record access (fire and forget)
    recordShareAccess(token).catch(() => {
      // Ignore errors
    });

    return {
      share,
      octokit,
      vaultConfig,
    };
  } catch {
    return null;
  }
}

/**
 * Get share metadata without decrypting token (for public info)
 */
export async function getShareMetadata(token: string) {
  const share = await getShareByToken(token);

  if (!share) {
    return null;
  }

  const folderName = share.folderPath.split("/").pop() || share.folderPath;

  // Base metadata
  const metadata: Record<string, unknown> = {
    token: share.token,
    shareType: share.shareType as "folder" | "note",
    folderPath: share.folderPath,
    folderName,
    includeSubfolders: share.includeSubfolders,
    mode: share.mode as "reader" | "writer" | "deposit",
    createdAt: share.createdAt.toISOString(),
    expiresAt: share.expiresAt.toISOString(),
    isExpired: share.expiresAt < new Date(),
  };

  // Add deposit config if in deposit mode
  if (share.mode === "deposit") {
    metadata.depositConfig = {
      maxFileSize: share.depositMaxFileSize || 10 * 1024 * 1024, // 10MB default
      allowedTypes: share.depositAllowedTypes
        ? JSON.parse(share.depositAllowedTypes)
        : null,
      depositFolder: share.depositFolder || null,
    };
  }

  return metadata;
}
