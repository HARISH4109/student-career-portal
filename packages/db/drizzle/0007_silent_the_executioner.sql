ALTER TYPE "public"."test_category" ADD VALUE 'quantitative_aptitude';--> statement-breakpoint
ALTER TYPE "public"."test_category" ADD VALUE 'logical_reasoning';--> statement-breakpoint
ALTER TYPE "public"."test_category" ADD VALUE 'programming';--> statement-breakpoint
ALTER TYPE "public"."test_category" ADD VALUE 'sql';--> statement-breakpoint
ALTER TYPE "public"."test_category" ADD VALUE 'role_specific';--> statement-breakpoint
CREATE TABLE "mock_test_answer_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"correct_answer_index" integer NOT NULL,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mock_test_answer_keys_question_id_unique" UNIQUE("question_id")
);
--> statement-breakpoint
CREATE TABLE "mock_test_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opportunity_applications" ALTER COLUMN "resume_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attempt_answers" ALTER COLUMN "selected_index" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ALTER COLUMN "correct_answer_index" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD COLUMN "time_spent_seconds" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD COLUMN "answered_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD COLUMN "target_role" varchar(150);--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD COLUMN "questions" jsonb;--> statement-breakpoint
ALTER TABLE "mock_interviews" ADD COLUMN "answers" jsonb;--> statement-breakpoint
ALTER TABLE "mock_test_attempts" ADD COLUMN "attempt_token" varchar(64);--> statement-breakpoint
ALTER TABLE "mock_test_attempts" ADD COLUMN "total_marks" integer;--> statement-breakpoint
ALTER TABLE "mock_test_attempts" ADD COLUMN "passing_marks" integer;--> statement-breakpoint
ALTER TABLE "mock_test_attempts" ADD COLUMN "is_passed" boolean;--> statement-breakpoint
ALTER TABLE "mock_test_attempts" ADD COLUMN "time_spent_seconds" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "mock_test_attempts" ADD COLUMN "evaluated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD COLUMN "difficulty" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD COLUMN "topic" varchar(100);--> statement-breakpoint
ALTER TABLE "mock_test_answer_keys" ADD CONSTRAINT "mock_test_answer_keys_question_id_mock_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."mock_test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_sections" ADD CONSTRAINT "mock_test_sections_test_id_mock_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD CONSTRAINT "mock_test_questions_section_id_mock_test_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."mock_test_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_answers_attempt_question_idx" ON "attempt_answers" USING btree ("attempt_id","question_id");