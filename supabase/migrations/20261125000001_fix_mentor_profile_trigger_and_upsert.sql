-- ============================================================
-- Migration: Fix mentor_profiles Trigger Security Context &
--            Idempotent Save Permissions
--
-- Root causes addressed:
-- 1. protect_mentor_profile_fields() was SECURITY DEFINER, causing
--    current_user inside the trigger to always evaluate to 'postgres'
--    instead of 'authenticated'. Consequently, fresh INSERTs by
--    approved mentors left activated = false, and trigger-level
--    protection was bypassed. Changing to SECURITY INVOKER ensures
--    current_user accurately reflects the caller ('authenticated' for
--    client requests vs 'postgres' for SECURITY DEFINER triggers).
-- 2. Legacy/cached clients or dataService.updateMentorProfile() that
--    pass activated unchanged in an UPDATE/UPSERT payload hit column
--    privilege 42501 ("permission denied for table mentor_profiles")
--    before reaching RLS/trigger validation. Allowing idempotent
--    activated in column grants while strictly enforcing immutability
--    in protect_mentor_profile_fields() and RLS prevents 42501 while
--    guaranteeing users cannot escalate or alter activated, rating,
--    review_count, user_id, or created_at.
-- 3. Harden is_public_mentor_profile() with SET search_path = ''.
-- ============================================================

-- 1. Ensure is_public_mentor_profile has explicit search_path & grants
CREATE OR REPLACE FUNCTION public.is_public_mentor_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_profiles AS mp
    JOIN public.mentor_applications AS ma ON ma.user_id = mp.user_id
    WHERE mp.user_id = profile_user_id
      AND mp.activated = true
      AND mp.profile_complete = true
      AND mp.published = true
      AND mp.professional_title <> ''
      AND mp.bio <> ''
      AND pg_catalog.jsonb_array_length(mp.skill_ids) > 0
      AND ma.status = 'approved'
      AND ma.identity_verified = true
      AND ma.competency_verified = true
      AND ma.admin_approved = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_public_mentor_profile(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_mentor_profile(uuid) TO anon, authenticated;

-- 2. Re-affirm least-privilege column grants on public.mentor_profiles
--    Excludes id, rating, review_count, created_at (and user_id on UPDATE).
GRANT SELECT ON TABLE public.mentor_profiles TO anon, authenticated;

GRANT INSERT (
  user_id,
  activated,
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
  activated,
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

-- 3. Fix protect_mentor_profile_fields() to SECURITY INVOKER so
--    current_user distinguishes direct client writes ('authenticated'/'anon')
--    from system triggers ('postgres' via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.protect_mentor_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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
        RAISE EXCEPTION 'Protected mentor profile fields cannot be modified directly'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_mentor_profile_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_mentor_profile_fields() TO authenticated, service_role;

DROP TRIGGER IF EXISTS protect_mentor_profile_fields ON public.mentor_profiles;
CREATE TRIGGER protect_mentor_profile_fields
  BEFORE INSERT OR UPDATE ON public.mentor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_mentor_profile_fields();
