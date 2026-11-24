-- ============================================================
-- Migration: Keep Published Mentors Visible When Unavailable
-- Allows published, verified, admin-approved mentors to toggle
-- availability between 'available' and 'unavailable' without
-- hiding or unpublishing their public profile, while blocking
-- new session requests when unavailable.
-- ============================================================

-- 1. Update public visibility helper: availability no longer hides a published mentor
CREATE OR REPLACE FUNCTION public.is_public_mentor_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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

-- 2. Prevent learners from submitting mentorship session requests to unavailable mentors
CREATE OR REPLACE FUNCTION public.is_mentor_accepting_requests(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_profiles AS mp
    WHERE mp.user_id = check_user_id
      AND mp.activated = true
      AND mp.published = true
      AND mp.availability <> 'unavailable'
  );
$$;

REVOKE ALL ON FUNCTION public.is_mentor_accepting_requests(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_mentor_accepting_requests(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Learners can request sessions with approved mentors" ON public.sessions;
CREATE POLICY "Learners can request sessions with approved mentors"
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = learner_id
    AND public.is_approved_mentor(mentor_id)
    AND public.is_mentor_accepting_requests(mentor_id)
  );
