import { db, vaultIndex, vaultIndexStatus, commitActivity } from "./index";
import { eq, and, gte, sql } from "drizzle-orm";
import type { NewVaultIndexEntry, VaultIndexEntry, VaultIndexStatus, CommitActivityEntry } from "./schema";

export interface VaultKey {
  userId: string;
  owner: string;
  repo: string;
  branch: string;
}

// === VAULT INDEX ENTRIES ===

export async function getVaultIndexEntry(
  vaultKey: VaultKey,
  filePath: string
): Promise<VaultIndexEntry | null> {
  const [entry] = await db
    .select()
    .from(vaultIndex)
    .where(
      and(
        eq(vaultIndex.userId, vaultKey.userId),
        eq(vaultIndex.owner, vaultKey.owner),
        eq(vaultIndex.repo, vaultKey.repo),
        eq(vaultIndex.branch, vaultKey.branch),
        eq(vaultIndex.filePath, filePath)
      )
    )
    .limit(1);

  return entry ?? null;
}

export async function getAllVaultIndexEntries(
  vaultKey: VaultKey
): Promise<VaultIndexEntry[]> {
  return db
    .select()
    .from(vaultIndex)
    .where(
      and(
        eq(vaultIndex.userId, vaultKey.userId),
        eq(vaultIndex.owner, vaultKey.owner),
        eq(vaultIndex.repo, vaultKey.repo),
        eq(vaultIndex.branch, vaultKey.branch)
      )
    );
}

export async function getPublicVaultIndexEntries(
  vaultKey: VaultKey
): Promise<VaultIndexEntry[]> {
  return db
    .select()
    .from(vaultIndex)
    .where(
      and(
        eq(vaultIndex.userId, vaultKey.userId),
        eq(vaultIndex.owner, vaultKey.owner),
        eq(vaultIndex.repo, vaultKey.repo),
        eq(vaultIndex.branch, vaultKey.branch),
        eq(vaultIndex.isPrivate, false)
      )
    );
}

export async function upsertVaultIndexEntry(
  entry: NewVaultIndexEntry
): Promise<VaultIndexEntry> {
  const [result] = await db
    .insert(vaultIndex)
    .values(entry)
    .onConflictDoUpdate({
      target: [vaultIndex.userId, vaultIndex.owner, vaultIndex.repo, vaultIndex.branch, vaultIndex.filePath],
      set: {
        fileName: entry.fileName,
        fileSha: entry.fileSha,
        tags: entry.tags,
        wikilinks: entry.wikilinks,
        frontmatter: entry.frontmatter,
        isPrivate: entry.isPrivate,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

export async function upsertManyVaultIndexEntries(
  entries: NewVaultIndexEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  for (const entry of entries) {
    await upsertVaultIndexEntry(entry);
  }
}

export async function deleteVaultIndexEntry(
  vaultKey: VaultKey,
  filePath: string
): Promise<void> {
  await db
    .delete(vaultIndex)
    .where(
      and(
        eq(vaultIndex.userId, vaultKey.userId),
        eq(vaultIndex.owner, vaultKey.owner),
        eq(vaultIndex.repo, vaultKey.repo),
        eq(vaultIndex.branch, vaultKey.branch),
        eq(vaultIndex.filePath, filePath)
      )
    );
}

export async function deleteAllVaultIndexEntries(vaultKey: VaultKey): Promise<void> {
  await db
    .delete(vaultIndex)
    .where(
      and(
        eq(vaultIndex.userId, vaultKey.userId),
        eq(vaultIndex.owner, vaultKey.owner),
        eq(vaultIndex.repo, vaultKey.repo),
        eq(vaultIndex.branch, vaultKey.branch)
      )
    );
}

export async function getVaultIndexShas(
  vaultKey: VaultKey
): Promise<Map<string, string>> {
  const entries = await db
    .select({ filePath: vaultIndex.filePath, fileSha: vaultIndex.fileSha })
    .from(vaultIndex)
    .where(
      and(
        eq(vaultIndex.userId, vaultKey.userId),
        eq(vaultIndex.owner, vaultKey.owner),
        eq(vaultIndex.repo, vaultKey.repo),
        eq(vaultIndex.branch, vaultKey.branch)
      )
    );

  return new Map(entries.map((e) => [e.filePath, e.fileSha]));
}

export async function deleteVaultIndexEntries(
  vaultKey: VaultKey,
  filePaths: string[]
): Promise<void> {
  if (filePaths.length === 0) return;

  for (const filePath of filePaths) {
    await db
      .delete(vaultIndex)
      .where(
        and(
          eq(vaultIndex.userId, vaultKey.userId),
          eq(vaultIndex.owner, vaultKey.owner),
          eq(vaultIndex.repo, vaultKey.repo),
          eq(vaultIndex.branch, vaultKey.branch),
          eq(vaultIndex.filePath, filePath)
        )
      );
  }
}

// === VAULT INDEX STATUS ===

export async function getVaultIndexStatus(vaultKey: VaultKey): Promise<VaultIndexStatus | null> {
  const [status] = await db
    .select()
    .from(vaultIndexStatus)
    .where(
      and(
        eq(vaultIndexStatus.userId, vaultKey.userId),
        eq(vaultIndexStatus.owner, vaultKey.owner),
        eq(vaultIndexStatus.repo, vaultKey.repo),
        eq(vaultIndexStatus.branch, vaultKey.branch)
      )
    )
    .limit(1);

  return status ?? null;
}

export async function upsertVaultIndexStatus(
  vaultKey: VaultKey,
  data: Partial<Omit<VaultIndexStatus, "id" | "userId" | "owner" | "repo" | "branch" | "createdAt">>
): Promise<VaultIndexStatus> {
  const [result] = await db
    .insert(vaultIndexStatus)
    .values({
      ...vaultKey,
      ...data,
    })
    .onConflictDoUpdate({
      target: [vaultIndexStatus.userId, vaultIndexStatus.owner, vaultIndexStatus.repo, vaultIndexStatus.branch],
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

export async function startIndexing(
  vaultKey: VaultKey,
  totalFiles: number
): Promise<VaultIndexStatus> {
  return upsertVaultIndexStatus(vaultKey, {
    status: "indexing",
    totalFiles,
    indexedFiles: 0,
    failedFiles: 0,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
  });
}

export async function updateIndexingProgress(
  vaultKey: VaultKey,
  indexedFiles: number,
  failedFiles: number
): Promise<VaultIndexStatus> {
  return upsertVaultIndexStatus(vaultKey, {
    indexedFiles,
    failedFiles,
  });
}

export async function completeIndexing(
  vaultKey: VaultKey,
  indexedFiles: number,
  failedFiles: number
): Promise<VaultIndexStatus> {
  return upsertVaultIndexStatus(vaultKey, {
    status: "completed",
    indexedFiles,
    failedFiles,
    completedAt: new Date(),
  });
}

export async function failIndexing(
  vaultKey: VaultKey,
  errorMessage: string
): Promise<VaultIndexStatus> {
  return upsertVaultIndexStatus(vaultKey, {
    status: "failed",
    errorMessage,
    completedAt: new Date(),
  });
}

// === COMMIT ACTIVITY ===

export interface CommitActivityData {
  date: string; // YYYY-MM-DD
  count: number;
}

export async function getCommitActivity(
  vaultKey: VaultKey,
  sinceDays: number = 365
): Promise<CommitActivityData[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const sinceDateStr = sinceDate.toISOString().split("T")[0];

  const entries = await db
    .select({ date: commitActivity.date, count: commitActivity.count })
    .from(commitActivity)
    .where(
      and(
        eq(commitActivity.userId, vaultKey.userId),
        eq(commitActivity.owner, vaultKey.owner),
        eq(commitActivity.repo, vaultKey.repo),
        eq(commitActivity.branch, vaultKey.branch),
        gte(commitActivity.date, sinceDateStr)
      )
    )
    .orderBy(commitActivity.date);

  return entries;
}

export async function upsertCommitActivity(
  vaultKey: VaultKey,
  activities: CommitActivityData[]
): Promise<void> {
  if (activities.length === 0) return;

  for (const activity of activities) {
    await db
      .insert(commitActivity)
      .values({
        ...vaultKey,
        date: activity.date,
        count: activity.count,
      })
      .onConflictDoUpdate({
        target: [
          commitActivity.userId,
          commitActivity.owner,
          commitActivity.repo,
          commitActivity.branch,
          commitActivity.date,
        ],
        set: {
          count: activity.count,
          updatedAt: new Date(),
        },
      });
  }
}

export async function deleteAllCommitActivity(vaultKey: VaultKey): Promise<void> {
  await db
    .delete(commitActivity)
    .where(
      and(
        eq(commitActivity.userId, vaultKey.userId),
        eq(commitActivity.owner, vaultKey.owner),
        eq(commitActivity.repo, vaultKey.repo),
        eq(commitActivity.branch, vaultKey.branch)
      )
    );
}

export async function hasCommitActivity(vaultKey: VaultKey): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(commitActivity)
    .where(
      and(
        eq(commitActivity.userId, vaultKey.userId),
        eq(commitActivity.owner, vaultKey.owner),
        eq(commitActivity.repo, vaultKey.repo),
        eq(commitActivity.branch, vaultKey.branch)
      )
    );

  return (result?.count ?? 0) > 0;
}
