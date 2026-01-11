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
    includeSubfolders: boolean("include_subfolders").default(true).notNull(),

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
