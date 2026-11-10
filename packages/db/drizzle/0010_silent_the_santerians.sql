CREATE TABLE IF NOT EXISTS "mock_interview_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_title" varchar(150) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'technical' NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(150) NOT NULL,
	"slug" varchar(180),
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_paths_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resource_career_paths" (
	"resource_id" uuid NOT NULL,
	"career_path_id" uuid NOT NULL,
	CONSTRAINT "resource_career_paths_resource_id_career_path_id_pk" PRIMARY KEY("resource_id","career_path_id")
);
--> statement-breakpoint
CREATE TABLE "resource_skills" (
	"resource_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "resource_skills_resource_id_skill_id_pk" PRIMARY KEY("resource_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "career_roadmaps" ADD COLUMN "career_path_id" uuid;--> statement-breakpoint
ALTER TABLE "career_roadmaps" ADD COLUMN "started_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "career_roadmaps" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roadmap_stages" ADD COLUMN "snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "roadmap_stages" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roadmap_stages" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "skill_gap_analyses" ADD COLUMN "career_path_id" uuid;--> statement-breakpoint
ALTER TABLE "skill_gap_analyses" ADD COLUMN "opportunity_id" uuid;--> statement-breakpoint
ALTER TABLE "skill_gap_analyses" ADD COLUMN "rule_version" varchar(50) DEFAULT 'phase6-rules-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_gap_analyses" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "learning_resources" ADD COLUMN "difficulty" varchar(20) DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_resources" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_resources" ADD COLUMN "seed_key" varchar(200);--> statement-breakpoint
-- Some Phase 5 databases already contain the identical table with a manually named FK.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mock_interview_templates'::regclass AND contype = 'f' AND confrelid = 'public.users'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.mock_interview_templates'::regclass AND attname = 'created_by')]::smallint[]) THEN
    ALTER TABLE "mock_interview_templates" ADD CONSTRAINT "mock_interview_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "career_paths" ADD CONSTRAINT "career_paths_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_career_paths" ADD CONSTRAINT "resource_career_paths_resource_id_learning_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_career_paths" ADD CONSTRAINT "resource_career_paths_career_path_id_career_paths_id_fk" FOREIGN KEY ("career_path_id") REFERENCES "public"."career_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_resource_id_learning_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mock_interview_templates_active_idx" ON "mock_interview_templates" USING btree ("is_active","created_at");--> statement-breakpoint
-- Preserve legacy roadmaps while retaining only the newest active goal.
WITH ranked AS (SELECT id, row_number() OVER (PARTITION BY student_id ORDER BY created_at DESC, id DESC) AS position FROM career_roadmaps WHERE status = 'active')
UPDATE career_roadmaps SET status = 'archived' WHERE id IN (SELECT id FROM ranked WHERE position > 1);
--> statement-breakpoint
CREATE UNIQUE INDEX "career_roadmaps_one_active_idx" ON "career_roadmaps" USING btree ("student_id") WHERE "career_roadmaps"."status" = 'active';--> statement-breakpoint
-- Keep an audit copy of duplicate progress before consolidating each pair.
CREATE TABLE phase6_legacy_resource_progress AS SELECT * FROM resource_progress WHERE id IN (
  SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY student_id, resource_id ORDER BY updated_at DESC, id DESC) AS position FROM resource_progress) ranked WHERE position > 1
);
--> statement-breakpoint
DELETE FROM resource_progress WHERE id IN (SELECT id FROM phase6_legacy_resource_progress);
--> statement-breakpoint
CREATE UNIQUE INDEX "resource_progress_student_resource_idx" ON "resource_progress" USING btree ("student_id","resource_id");--> statement-breakpoint
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_seed_key_unique" UNIQUE("seed_key");
