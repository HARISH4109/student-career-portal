-- Close (not delete) legacy duplicate active attempts, keeping the newest, so the unique index can be created.
UPDATE "mock_test_attempts" a SET "status" = 'auto_submitted', "submitted_at" = now()
WHERE a."status" = 'in_progress' AND EXISTS (
  SELECT 1 FROM "mock_test_attempts" b
  WHERE b."test_id" = a."test_id" AND b."student_id" = a."student_id" AND b."status" = 'in_progress'
    AND (b."started_at", b."id") > (a."started_at", a."id")
);--> statement-breakpoint
CREATE INDEX "mock_interviews_student_created_idx" ON "mock_interviews" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_test_attempts_one_active_idx" ON "mock_test_attempts" USING btree ("test_id","student_id") WHERE "mock_test_attempts"."status" = 'in_progress';--> statement-breakpoint
CREATE INDEX "mock_test_attempts_student_status_idx" ON "mock_test_attempts" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "mock_test_attempts_test_status_idx" ON "mock_test_attempts" USING btree ("test_id","status");--> statement-breakpoint
CREATE INDEX "mock_test_questions_test_order_idx" ON "mock_test_questions" USING btree ("test_id","order_index");