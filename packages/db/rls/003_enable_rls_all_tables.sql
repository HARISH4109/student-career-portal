-- ============================================================================
-- Row-Level Security policies for all remaining active tables (default-deny)
-- ============================================================================
-- Apply after Drizzle migrations:
--   psql "$DATABASE_URL" -f packages/db/rls/003_enable_rls_all_tables.sql
--
-- Express connects via DATABASE_URL / service_role (bypassing RLS). Enabling
-- RLS with no permissive anon/authenticated policies enforces default-deny
-- against direct Supabase PostgREST queries for internal/sensitive tables.
-- ============================================================================

-- Identity & RBAC
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_select_own ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Audit & AI Observability (service_role only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_job_logs ENABLE ROW LEVEL SECURITY;

-- Academic reference catalogs
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Skills & Resume Intelligence
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;

-- Opportunities, AI Ingestion & Applications
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY opportunities_read_published ON opportunities
  FOR SELECT TO authenticated
  USING (status = 'published');

ALTER TABLE opportunity_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY opportunity_applications_owner_select ON opportunity_applications
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_opportunities_owner_full_access ON saved_opportunities
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE opportunity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_drafts ENABLE ROW LEVEL SECURITY;

-- Mock Tests, Answer Keys & Interviews (answer keys strictly service_role only)
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interview_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions_bank ENABLE ROW LEVEL SECURITY;

-- Engagement, Recommendations & Analytics
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_preferences_owner_select ON notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notification_preferences_owner_update ON notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
