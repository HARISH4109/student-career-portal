-- ============================================================================
-- Supabase Auth → public.users sync trigger
-- ============================================================================
-- Creates a corresponding row in public.users whenever a new user signs up
-- via Supabase Auth. This is the open item from ARCHITECTURE.md §"Open items
-- carried into Phase 1".
--
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- (Cannot be applied via Drizzle — it touches the auth schema)
--
-- The Express signup flow also inserts the users row explicitly (with
-- onConflictDoNothing) for immediate consistency, so this trigger serves as
-- a safety net for signups that bypass our API (e.g. Supabase social auth
-- providers added later).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-applying
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
