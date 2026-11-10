CREATE UNIQUE INDEX IF NOT EXISTS "saved_opportunities_student_opp_idx" ON "saved_opportunities" USING btree ("student_id", "opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "opportunity_applications_student_opp_idx" ON "opportunity_applications" USING btree ("student_id", "opportunity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_status_deadline_idx" ON "opportunities" USING btree ("status", "application_deadline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_company_id_idx" ON "opportunities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_type_idx" ON "opportunities" USING btree ("type");
