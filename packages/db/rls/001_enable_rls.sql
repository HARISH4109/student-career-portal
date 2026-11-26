-- ============================================================================
-- Row-Level Security policies
-- ============================================================================
-- These run AFTER drizzle migrations (Drizzle Kit does not manage RLS).
-- Apply via: psql $DATABASE_URL -f packages/db/rls/001_enable_rls.sql
--
-- Design principle: RLS here is a SAFETY NET, not the primary authorization
-- mechanism. Business rules (e.g. "a TPO can only manage drives for their own
-- department") live in the Express service layer, where they're testable and
-- can return rich error messages. RLS guarantees that even if a service-layer
-- bug or a compromised API key tries to read/write out-of-scope rows, the
-- database itself refuses the query.
--
-- Helper: current_user_id() reads the Supabase JWT 'sub' claim set on the
-- Postgres session by PostgREST/Supabase's JWT verification (auth.uid()).
-- ============================================================================

-- ── users ────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Service-role key (used by the Express backend) bypasses RLS entirely by
-- design (Supabase's service_role always bypasses RLS) — this is where the
-- richer, application-level authorization takes over for admin/TPO/recruiter
-- operations that legitimately need cross-user access.

-- ── student_profiles ────────────────────────────────────────────────────
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_profiles_select_own ON student_profiles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY student_profiles_update_own ON student_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

-- ── resumes ──────────────────────────────────────────────────────────────
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY resumes_owner_full_access ON resumes
  FOR ALL
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );

-- ── job_applications ─────────────────────────────────────────────────────
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_applications_owner_select ON job_applications
  FOR SELECT
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY job_applications_owner_insert ON job_applications
  FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );

-- Students may withdraw (update to 'withdrawn') but not otherwise mutate status —
-- status transitions beyond withdrawal are enforced in the service layer, which
-- uses the service_role connection.
CREATE POLICY job_applications_owner_withdraw ON job_applications
  FOR UPDATE
  USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()))
  WITH CHECK (status = 'withdrawn');

-- ── notifications ────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_owner_select ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_owner_update ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- ── mock_test_attempts ───────────────────────────────────────────────────
ALTER TABLE mock_test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mock_test_attempts_owner_full_access ON mock_test_attempts
  FOR ALL
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );

-- ── mock_interviews ──────────────────────────────────────────────────────
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY mock_interviews_owner_full_access ON mock_interviews
  FOR ALL
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );

-- ── Publicly-readable reference/catalog tables ──────────────────────────
-- Jobs, companies, notices, learning resources, mock tests: readable by any
-- authenticated user, writes restricted to service_role (i.e. gated by the
-- Express authorization layer, not by RLS write policies here).
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_read_published ON jobs
  FOR SELECT
  USING (status = 'published' OR posted_by = auth.uid());

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_read_all ON companies FOR SELECT USING (true);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY notices_read_published ON notices
  FOR SELECT
  USING (
    status = 'published'
    AND published_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );

ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_resources_read_all ON learning_resources FOR SELECT USING (true);
