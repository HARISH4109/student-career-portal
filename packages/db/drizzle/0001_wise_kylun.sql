CREATE TYPE "public"."draft_status" AS ENUM('extracted', 'pending_review', 'needs_correction', 'approved', 'rejected', 'published');--> statement-breakpoint
CREATE TYPE "public"."extraction_run_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."opportunity_status" AS ENUM('draft', 'pending_review', 'published', 'closed', 'expired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('email', 'pdf', 'image', 'text', 'url', 'manual');--> statement-breakpoint
ALTER TYPE "public"."resource_type" ADD VALUE 'research_paper' BEFORE 'course';--> statement-breakpoint
ALTER TYPE "public"."resource_type" ADD VALUE 'documentation' BEFORE 'ebook';--> statement-breakpoint
ALTER TYPE "public"."resource_type" ADD VALUE 'practice' BEFORE 'practice_set';--> statement-breakpoint
ALTER TYPE "public"."resource_type" ADD VALUE 'project';--> statement-breakpoint
CREATE TABLE "academic_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"degree_level" varchar(50) NOT NULL,
	"duration_years" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"graduation_year" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batches_graduation_year_unique" UNIQUE("graduation_year")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name"),
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "resume_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"ats_score" numeric(5, 2),
	"skill_score" numeric(5, 2),
	"keyword_score" numeric(5, 2),
	"missing_skills" jsonb DEFAULT '[]' NOT NULL,
	"improvement_suggestions" jsonb DEFAULT '[]' NOT NULL,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_stage_resources" (
	"stage_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	CONSTRAINT "roadmap_stage_resources_stage_id_resource_id_pk" PRIMARY KEY("stage_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "roadmap_stage_skills" (
	"stage_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "roadmap_stage_skills_stage_id_skill_id_pk" PRIMARY KEY("stage_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "roadmap_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" "extraction_run_status" DEFAULT 'queued' NOT NULL,
	"model_used" varchar(100),
	"confidence_score" numeric(5, 2),
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" "opportunity_type" NOT NULL,
	"description" text NOT NULL,
	"work_mode" "work_mode" DEFAULT 'onsite' NOT NULL,
	"location" varchar(150),
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"application_deadline" timestamp with time zone,
	"status" "opportunity_status" DEFAULT 'draft' NOT NULL,
	"posted_by" uuid NOT NULL,
	"source_draft_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"resume_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"cover_note" text,
	"ai_match_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extraction_run_id" uuid NOT NULL,
	"status" "draft_status" DEFAULT 'pending_review' NOT NULL,
	"title" varchar(200),
	"company_name" varchar(200),
	"type" "opportunity_type",
	"description" text,
	"location" varchar(150),
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"extracted_skills" jsonb DEFAULT '[]' NOT NULL,
	"extracted_eligibility" jsonb DEFAULT '{}' NOT NULL,
	"application_deadline" timestamp with time zone,
	"resulting_opportunity_id" uuid,
	"reviewed_by" uuid,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"department_id" uuid,
	"program_id" uuid,
	"batch_id" uuid,
	"min_cgpa" numeric(4, 2)
);
--> statement-breakpoint
CREATE TABLE "opportunity_skills" (
	"opportunity_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	CONSTRAINT "opportunity_skills_opportunity_id_skill_id_pk" PRIMARY KEY("opportunity_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "source_type" NOT NULL,
	"raw_content" text NOT NULL,
	"submitted_by" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_index" integer NOT NULL,
	"is_correct" boolean,
	"awarded_marks" numeric(6, 2)
);
--> statement-breakpoint
ALTER TABLE "ai_extraction_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job_applications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "placement_drives" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_extraction_logs" CASCADE;--> statement-breakpoint
DROP TABLE "job_applications" CASCADE;--> statement-breakpoint
DROP TABLE "jobs" CASCADE;--> statement-breakpoint
DROP TABLE "placement_drives" CASCADE;--> statement-breakpoint
ALTER TABLE "application_status_history" DROP CONSTRAINT IF EXISTS "application_status_history_application_id_job_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "application_status_history" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ALTER COLUMN "status" SET DEFAULT 'applied'::text;--> statement-breakpoint
DROP TYPE "public"."application_status";--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('applied', 'under_review', 'shortlisted', 'assessment', 'interview', 'selected', 'rejected', 'withdrawn');--> statement-breakpoint
ALTER TABLE "application_status_history" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::"public"."application_status";--> statement-breakpoint
ALTER TABLE "opportunity_applications" ALTER COLUMN "status" SET DEFAULT 'applied'::"public"."application_status";--> statement-breakpoint
ALTER TABLE "opportunity_applications" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::"public"."application_status";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('application_update', 'new_opportunity', 'notice_published', 'interview_reminder', 'recommendation', 'system');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";--> statement-breakpoint
ALTER TABLE "recommendations" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."recommendation_type";--> statement-breakpoint
CREATE TYPE "public"."recommendation_type" AS ENUM('opportunity', 'internship', 'learning_resource', 'skill_to_learn', 'mock_test');--> statement-breakpoint
ALTER TABLE "recommendations" ALTER COLUMN "type" SET DATA TYPE "public"."recommendation_type" USING "type"::"public"."recommendation_type";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "department_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "program_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "batch_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "target_department_id" uuid;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "target_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "algorithm_version" varchar(50);--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "reason_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "is_dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "academic_programs" ADD CONSTRAINT "academic_programs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_analyses" ADD CONSTRAINT "resume_analyses_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_stage_resources" ADD CONSTRAINT "roadmap_stage_resources_stage_id_roadmap_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."roadmap_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_stage_skills" ADD CONSTRAINT "roadmap_stage_skills_stage_id_roadmap_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."roadmap_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_stage_skills" ADD CONSTRAINT "roadmap_stage_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_stages" ADD CONSTRAINT "roadmap_stages_roadmap_id_career_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."career_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_extraction_runs" ADD CONSTRAINT "ai_extraction_runs_source_id_opportunity_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."opportunity_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_drafts" ADD CONSTRAINT "opportunity_drafts_extraction_run_id_ai_extraction_runs_id_fk" FOREIGN KEY ("extraction_run_id") REFERENCES "public"."ai_extraction_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_drafts" ADD CONSTRAINT "opportunity_drafts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_eligibility" ADD CONSTRAINT "opportunity_eligibility_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_eligibility" ADD CONSTRAINT "opportunity_eligibility_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_eligibility" ADD CONSTRAINT "opportunity_eligibility_program_id_academic_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."academic_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_eligibility" ADD CONSTRAINT "opportunity_eligibility_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_skills" ADD CONSTRAINT "opportunity_skills_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_skills" ADD CONSTRAINT "opportunity_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_mock_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."mock_test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_mock_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."mock_test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_program_id_academic_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."academic_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_opportunity_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."opportunity_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_target_department_id_departments_id_fk" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_target_batch_id_batches_id_fk" FOREIGN KEY ("target_batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_roadmaps" DROP COLUMN "milestones";--> statement-breakpoint
ALTER TABLE "student_profiles" DROP COLUMN "department";--> statement-breakpoint
ALTER TABLE "student_profiles" DROP COLUMN "batch_year";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "mock_test_attempts" DROP COLUMN "answers";--> statement-breakpoint
DROP TYPE "public"."drive_status";--> statement-breakpoint
DROP TYPE "public"."extraction_status";--> statement-breakpoint
DROP TYPE "public"."job_status";