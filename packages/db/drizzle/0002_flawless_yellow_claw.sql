ALTER TABLE "resume_analyses" ADD COLUMN "overall_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "resume_analyses" ADD COLUMN "format_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "resume_analyses" ADD COLUMN "model_version" varchar(100) DEFAULT 'v1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "career_interests" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "projects" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "certifications" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "achievements" jsonb DEFAULT '[]' NOT NULL;