ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "request_id" varchar(64);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_request_id_idx" ON "audit_logs" USING btree ("request_id");

