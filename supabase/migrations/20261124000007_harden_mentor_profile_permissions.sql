-- ============================================================
-- Migration: Harden mentor_profiles Permissions, RLS & Triggers
-- Fixes overly broad grants/policies from 20261124000006 while
-- preserving full profile create/update for approved mentors.
-- Also grants authenticated avatar_url update & anon avatar_url
-- select on public.profiles so avatar syncing works cleanly.
-- ============================================================

-- 1. Helper: verify mentor has passed competency verification & admin approval
CREATE OR REPLACE FUNCTION public.is_verified_approved_mentor(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_applications AS ma
    WHERE ma.user_id = check_user_id
      AND ma.status = 'approved'
      AND ma.competency_verified = true
      AND ma.admin_approved = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_verified_approved_mentor(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_approved_mentor(uuid) TO authenticated;

-- 2. Strict least-privilege column-level grants on public.mentor_profiles
-- Protects system/authorization/aggregate columns:
--   id, activated, rating, review_count, created_at
REVOKE ALL ON TABLE public.mentor_profiles FROM anon, authenticated;
GRANT ALL ON TABLE public.mentor_profiles TO service_role;
GRANT SELECT ON TABLE public.mentor_profiles TO anon, authenticated;

GRANT INSERT (
  user_id,
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

-- 3. Allow avatar_url sync on public.profiles & public avatar display on mentor cards
GRANT SELECT (id, full_name, email, role, avatar_url) ON TABLE public.profiles TO anon;
GRANT UPDATE (full_name, avatar_url) ON TABLE public.profiles TO authenticated;

-- 4. Tighten RLS policies on public.mentor_profiles
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentors can create their profile" ON public.mentor_profiles;
CREATE POLICY "Mentors can create their profile"
  ON public.mentor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = user_id
      AND public.is_verified_approved_mentor(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mentors and admins can update mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Mentors and admins can update mentor profiles"
  ON public.mentor_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = user_id
      AND (
        published = false
        OR public.is_verified_approved_mentor(auth.uid())
      )
    )
  );

-- 5. Database trigger protecting authorization & computed rating fields on direct client writes
-- Allows SECURITY DEFINER functions owned by postgres (onboarding & review triggers) to update those fields.
CREATE OR REPLACE FUNCTION public.protect_mentor_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.activated := public.is_verified_approved_mentor(NEW.user_id);
      NEW.rating := 0;
      NEW.review_count := 0;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.user_id IS DISTINCT FROM NEW.user_id
        OR OLD.activated IS DISTINCT FROM NEW.activated
        OR OLD.rating IS DISTINCT FROM NEW.rating
        OR OLD.review_count IS DISTINCT FROM NEW.review_count
        OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
        RAISE EXCEPTION 'Protected mentor profile fields cannot be modified directly';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_mentor_profile_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_mentor_profile_fields ON public.mentor_profiles;
CREATE TRIGGER protect_mentor_profile_fields
  BEFORE INSERT OR UPDATE ON public.mentor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_mentor_profile_fields();
