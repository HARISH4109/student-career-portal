ALTER TYPE "public"."notification_type" ADD VALUE 'opportunity_deadline';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'test_assigned';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'test_result_ready';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'roadmap_reminder';--> statement-breakpoint
CREATE TYPE "public"."notice_status" AS ENUM('draft', 'scheduled', 'published', 'expired', 'archived');--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "status" "notice_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "published_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notices_status_published" ON "notices" ("status", "published_at", "expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notices_pinned" ON "notices" ("is_pinned");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notices_targeting" ON "notices" ("target_department_id", "target_batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "is_read", "created_at" DESC);

