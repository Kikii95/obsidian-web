import { eq, and, gt, lt } from "drizzle-orm";
import { db, shares, type Share, type NewShare } from "@/lib/db";
import { nanoid } from "nanoid";
import { encryptToken } from "./encryption";
import { getExpirationMs, type ExpirationValue, type ShareType } from "@/types/shares";

/**
 * Create a new share
 */
export async function createShare(params: {
  userId: string;
  username: string;
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  rootPath: string;
  shareType?: ShareType;
  folderPath: string;
  includeSubfolders?: boolean;
  expiresIn: ExpirationValue;
}): Promise<Share> {
  const encryptedToken = await encryptToken(params.accessToken);
  const expiresAt = new Date(Date.now() + getExpirationMs(params.expiresIn));

  const newShare: NewShare = {
    token: nanoid(21),
    userId: params.userId,
    username: params.username,
    encryptedToken,
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    rootPath: params.rootPath ?? "",
    shareType: params.shareType ?? "folder",
    folderPath: params.folderPath,
    includeSubfolders: params.shareType === "note" ? false : (params.includeSubfolders ?? true),
    expiresAt,
  };

  const [share] = await db.insert(shares).values(newShare).returning();
  return share;
}

/**
 * Get a share by token (for public access)
 * Returns null if not found or expired
 */
export async function getShareByToken(token: string): Promise<Share | null> {
  const [share] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.token, token), gt(shares.expiresAt, new Date())))
    .limit(1);

  return share ?? null;
}

/**
 * Get a share by token without expiration check (for metadata)
 */
export async function getShareByTokenRaw(token: string): Promise<Share | null> {
  const [share] = await db
    .select()
    .from(shares)
    .where(eq(shares.token, token))
    .limit(1);

  return share ?? null;
}

/**
 * List all shares for a user
 */
export async function listUserShares(userId: string): Promise<Share[]> {
  return db
    .select()
    .from(shares)
    .where(eq(shares.userId, userId))
    .orderBy(shares.createdAt);
}

/**
 * Delete a share (revoke access)
 */
export async function deleteShare(
  token: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(shares)
    .where(and(eq(shares.token, token), eq(shares.userId, userId)))
    .returning({ id: shares.id });

  return result.length > 0;
}

/**
 * Increment access count and update last accessed timestamp
 */
export async function recordShareAccess(token: string): Promise<void> {
  await db
    .update(shares)
    .set({
      accessCount: shares.accessCount,
      lastAccessedAt: new Date(),
    })
    .where(eq(shares.token, token));

  // Use raw SQL for increment since Drizzle doesn't support it directly
  // This is a workaround
  const share = await getShareByToken(token);
  if (share) {
    await db
      .update(shares)
      .set({
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date(),
      })
      .where(eq(shares.token, token));
  }
}

/**
 * Clean up expired shares (for cron job)
 */
export async function cleanupExpiredShares(): Promise<number> {
  const result = await db
    .delete(shares)
    .where(lt(shares.expiresAt, new Date())) // expiresAt < now = expired
    .returning({ id: shares.id });

  return result.length;
}
