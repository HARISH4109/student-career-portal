ALTER TABLE "opportunity_sources" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD COLUMN "mime_type" varchar(150);--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_content_hash_unique" UNIQUE("content_hash");