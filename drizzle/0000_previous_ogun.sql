CREATE TABLE "pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"path" varchar(1024) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(10) NOT NULL,
	"order" integer NOT NULL,
	"pinned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(21) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"encrypted_token" text NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"branch" varchar(255) DEFAULT 'main' NOT NULL,
	"root_path" varchar(1024) DEFAULT '',
	"share_type" varchar(10) DEFAULT 'folder' NOT NULL,
	"folder_path" varchar(1024) NOT NULL,
	"name" varchar(255),
	"include_subfolders" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_accessed_at" timestamp,
	"access_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX "idx_pins_user_id" ON "pins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pins_user_path" ON "pins" USING btree ("user_id","path");--> statement-breakpoint
CREATE INDEX "idx_shares_token" ON "shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_shares_user_id" ON "shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_shares_expires_at" ON "shares" USING btree ("expires_at");