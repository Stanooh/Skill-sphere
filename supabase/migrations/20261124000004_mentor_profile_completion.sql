-- ============================================================
-- Migration: Mentor Profile Completion & Public Profile Generation
-- Adds rich professional profile fields, social links, availability,
-- experience arrays, and publication status to mentor_profiles.
-- Also ensures profiles table has avatar_url.
-- ============================================================

-- 1. Ensure profiles has avatar_url
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add rich professional fields to mentor_profiles
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS company text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS learner_levels jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mentorship_approach text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS preferred_formats jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_days jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_time_slots jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS accepting_learners boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS linkedin_url text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS github_url text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS portfolio_url text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS website_url text DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;

-- 3. Update public mentor profile visibility function
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
      AND (mp.published = true OR mp.activated = true)
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

-- 4. RLS Policy: Ensure authenticated mentors can view verified application skills
-- (Already exists, but ensure mentors can select application skills for their verified application)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mentor_application_skills' 
    AND policyname = 'Mentors can view their own application skills'
  ) THEN
    CREATE POLICY "Mentors can view their own application skills"
      ON public.mentor_application_skills
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.mentor_applications a
          WHERE a.id = mentor_application_skills.application_id
            AND a.user_id = auth.uid()
        )
      );
  END IF;
END $$;
