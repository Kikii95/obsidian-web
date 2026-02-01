import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: varchar("token", { length: 21 }).unique().notNull(),

    // Owner info
    userId: varchar("user_id", { length: 255 }).notNull(),
    username: varchar("username", { length: 255 }).notNull(),

    // GitHub credentials (encrypted)
    encryptedToken: text("encrypted_token").notNull(),

    // Vault info
    owner: varchar("owner", { length: 255 }).notNull(),
    repo: varchar("repo", { length: 255 }).notNull(),
    branch: varchar("branch", { length: 255 }).default("main").notNull(),
    rootPath: varchar("root_path", { length: 1024 }).default(""),

    // Share config
    shareType: varchar("share_type", { length: 10 }).default("folder").notNull(), // 'folder' | 'note'
    folderPath: varchar("folder_path", { length: 1024 }).notNull(), // folder path OR note path (without .md)
    name: varchar("name", { length: 255 }), // optional custom name for the share link
    includeSubfolders: boolean("include_subfolders").default(true).notNull(),
    mode: varchar("mode", { length: 10 }).default("reader").notNull(), // 'reader' | 'writer' | 'deposit'

    // Deposit-specific configuration (null for reader/writer modes)
    depositMaxFileSize: integer("deposit_max_file_size"), // bytes, null = 10MB default
    depositAllowedTypes: text("deposit_allowed_types"), // JSON array of extensions, null = all types
    depositFolder: varchar("deposit_folder", { length: 1024 }), // subfolder for uploads, null = share root

    // Permission flags (for reader/writer modes)
    allowCopy: boolean("allow_copy").default(true).notNull(), // Allow copying to user's vault
    allowExport: boolean("allow_export").default(true).notNull(), // Allow export to PDF/MD

    // Lifecycle
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),
    accessCount: integer("access_count").default(0).notNull(),
  },
  (table) => [
    index("idx_shares_token").on(table.token),
    index("idx_shares_user_id").on(table.userId),
    index("idx_shares_expires_at").on(table.expiresAt),
  ]
);

export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;

// Pins table for cross-device pin persistence
export const pins = pgTable(
  "pins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 255 }).notNull(),

    // Pin info
    path: varchar("path", { length: 1024 }).notNull(), // File or folder path
    name: varchar("name", { length: 255 }).notNull(), // Display name
    type: varchar("type", { length: 10 }).notNull(), // 'note' | 'folder'
    order: integer("order").notNull(), // Position in the list

    // Timestamps
    pinnedAt: timestamp("pinned_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_pins_user_id").on(table.userId),
    index("idx_pins_user_path").on(table.userId, table.path),
  ]
);

export type Pin = typeof pins.$inferSelect;
export type NewPin = typeof pins.$inferInsert;

// Vault Index - stores parsed file data for fast queries (tags, wikilinks, etc.)
export const vaultIndex = pgTable(
  "vault_index",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Vault composite key
    userId: varchar("user_id", { length: 255 }).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    repo: varchar("repo", { length: 255 }).notNull(),
    branch: varchar("branch", { length: 255 }).notNull(),

    // File info
    filePath: varchar("file_path", { length: 1024 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSha: varchar("file_sha", { length: 40 }).notNull(),

    // Indexed data (JSONB for flexibility)
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    wikilinks: jsonb("wikilinks").$type<{ target: string; display?: string; isEmbed: boolean }[]>().default([]).notNull(),
    frontmatter: jsonb("frontmatter").$type<Record<string, unknown>>().default({}).notNull(),

    // Privacy flag (cached from content parsing)
    isPrivate: boolean("is_private").default(false).notNull(),

    // Timestamps
    indexedAt: timestamp("indexed_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_vault_index_vault").on(table.userId, table.owner, table.repo, table.branch),
    index("idx_vault_index_sha").on(table.fileSha),
    uniqueIndex("idx_vault_index_file").on(table.userId, table.owner, table.repo, table.branch, table.filePath),
  ]
);

export type VaultIndexEntry = typeof vaultIndex.$inferSelect;
export type NewVaultIndexEntry = typeof vaultIndex.$inferInsert;

// Vault Index Status - tracks indexing progress
export const vaultIndexStatus = pgTable(
  "vault_index_status",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Vault composite key
    userId: varchar("user_id", { length: 255 }).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    repo: varchar("repo", { length: 255 }).notNull(),
    branch: varchar("branch", { length: 255 }).notNull(),

    // Progress
    status: varchar("status", { length: 20 }).$type<"pending" | "indexing" | "completed" | "failed">().default("pending").notNull(),
    totalFiles: integer("total_files").default(0).notNull(),
    indexedFiles: integer("indexed_files").default(0).notNull(),
    failedFiles: integer("failed_files").default(0).notNull(),
    errorMessage: text("error_message"),

    // Timestamps
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_vault_index_status_vault").on(table.userId, table.owner, table.repo, table.branch),
  ]
)

export type VaultIndexStatus = typeof vaultIndexStatus.$inferSelect;
export type NewVaultIndexStatus = typeof vaultIndexStatus.$inferInsert;
