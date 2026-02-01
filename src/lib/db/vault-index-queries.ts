import { db, vaultIndex, vaultIndexStatus } from "./index";
import { eq, and } from "drizzle-orm";
import type { NewVaultIndexEntry, VaultIndexEntry, VaultIndexStatus } from "./schema";

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
