ALTER TABLE "resume_analyses" ADD COLUMN "ai_insights" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "resume_analyses" ADD COLUMN "ai_summary_rewrite" text;