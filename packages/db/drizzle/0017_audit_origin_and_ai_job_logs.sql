-- Migration 0017: Add origin to audit_logs and create ai_job_logs table for comprehensive AI observability

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "origin" varchar(255);
CREATE INDEX IF NOT EXISTS "audit_logs_origin_idx" ON "audit_logs" ("origin");

CREATE TABLE IF NOT EXISTS "ai_job_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_name" varchar(100) NOT NULL,
  "task_type" varchar(50) NOT NULL,
  "model_used" varchar(100),
  "status" varchar(20) DEFAULT 'failed' NOT NULL,
  "error_message" text,
  "duration_ms" integer,
  "request_id" varchar(64),
  "origin" varchar(255),
  "payload_preview" text,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_job_logs_service_name_idx" ON "ai_job_logs" ("service_name");
CREATE INDEX IF NOT EXISTS "ai_job_logs_task_type_idx" ON "ai_job_logs" ("task_type");
CREATE INDEX IF NOT EXISTS "ai_job_logs_status_idx" ON "ai_job_logs" ("status");
CREATE INDEX IF NOT EXISTS "ai_job_logs_created_at_idx" ON "ai_job_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_job_logs_user_id_idx" ON "ai_job_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_job_logs_request_id_idx" ON "ai_job_logs" ("request_id");

