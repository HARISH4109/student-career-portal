ALTER TABLE "notices" ADD COLUMN IF NOT EXISTS "poster_url" text;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN IF NOT EXISTS "action_url" text;

