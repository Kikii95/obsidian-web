ALTER TABLE "shares" ADD COLUMN "mode" varchar(10) DEFAULT 'reader' NOT NULL;--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "deposit_max_file_size" integer;--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "deposit_allowed_types" text;--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "deposit_folder" varchar(1024);--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "allow_copy" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "allow_export" boolean DEFAULT true NOT NULL;