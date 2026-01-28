import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
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
