CREATE TABLE "vault_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"branch" varchar(255) NOT NULL,
	"file_path" varchar(1024) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_sha" varchar(40) NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wikilinks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"frontmatter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"indexed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_index_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"branch" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_files" integer DEFAULT 0 NOT NULL,
	"indexed_files" integer DEFAULT 0 NOT NULL,
	"failed_files" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_vault_index_vault" ON "vault_index" USING btree ("user_id","owner","repo","branch");--> statement-breakpoint
CREATE INDEX "idx_vault_index_sha" ON "vault_index" USING btree ("file_sha");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vault_index_file" ON "vault_index" USING btree ("user_id","owner","repo","branch","file_path");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vault_index_status_vault" ON "vault_index_status" USING btree ("user_id","owner","repo","branch");