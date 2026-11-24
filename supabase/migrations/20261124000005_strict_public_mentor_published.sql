-- Migration: 20261124000005_strict_public_mentor_published.sql
-- Description: Strictly enforces that mentor profiles must be published (published = true)
-- along with verified and activated to be publicly visible.

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
      AND mp.availability <> 'unavailable'
      AND ma.status = 'approved'
      AND ma.identity_verified = true
      AND ma.competency_verified = true
      AND ma.admin_approved = true
  );
$$;
