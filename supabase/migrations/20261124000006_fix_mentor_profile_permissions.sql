-- ============================================================
-- Migration: Fix mentor_profiles table privileges
-- Root cause: The original migration (20261119000001) granted
-- column-level UPDATE on only the original columns. Migration
-- 20261124000004 added 17 new columns but never updated the
-- GRANT. Additionally, production shows zero grants on the table
-- for anon/authenticated, so we re-issue all required grants.
-- ============================================================

-- 1. Ensure service_role always has full access
GRANT ALL ON TABLE public.mentor_profiles TO service_role;

-- 2. SELECT for both anon (public browsing) and authenticated
GRANT SELECT ON TABLE public.mentor_profiles TO anon, authenticated;

-- 3. INSERT for authenticated (upsert requires INSERT privilege)
GRANT INSERT ON TABLE public.mentor_profiles TO authenticated;

-- 4. UPDATE: grant on ALL profile-editable columns, including the
--    17 new columns from 20261124000004.
--    Excludes protected columns: id, user_id, created_at, rating, review_count
GRANT UPDATE (
  professional_title,
  bio,
  location,
  experience_years,
  education,
  certifications,
  availability,
  mentorship_areas,
  skill_ids,
  profile_complete,
  activated,
  updated_at,
  avatar_url,
  company,
  work_experience,
  education_history,
  learner_levels,
  mentorship_approach,
  preferred_formats,
  languages,
  available_days,
  preferred_time_slots,
  timezone,
  accepting_learners,
  linkedin_url,
  github_url,
  portfolio_url,
  website_url,
  published
) ON TABLE public.mentor_profiles TO authenticated;

-- 5. Fix INSERT RLS policy: the trigger creates the row with activated=true,
--    so the old "activated = false" WITH CHECK blocks the upsert INSERT leg.
--    Allow INSERT when auth.uid() = user_id (RLS still prevents creating
--    profiles for other users).
DROP POLICY IF EXISTS "Mentors can create their profile" ON public.mentor_profiles;
CREATE POLICY "Mentors can create their profile"
  ON public.mentor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Re-create UPDATE policy (idempotent) — ensure mentors can update own,
--    admins can update any.
DROP POLICY IF EXISTS "Mentors and admins can update mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Mentors and admins can update mentor profiles"
  ON public.mentor_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 7. Verify RLS is still enabled (safety net)
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
