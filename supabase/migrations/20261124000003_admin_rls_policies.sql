-- ============================================================
-- Migration: Admin RLS Policies for Full Dashboard Access
-- Adds SELECT/ALL policies for admin users on tables they need
-- to manage the platform. All policies verify role via profiles.
-- ============================================================

-- Helper: check if the calling user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- sessions: allow admins to view ALL sessions
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;
CREATE POLICY "Admins can view all sessions"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- workshops: allow admins to view ALL workshops (including drafts)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all workshops" ON public.workshops;
CREATE POLICY "Admins can view all workshops"
  ON public.workshops
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Allow admins to update any workshop (e.g. publish/unpublish)
DROP POLICY IF EXISTS "Admins can update any workshop" ON public.workshops;
CREATE POLICY "Admins can update any workshop"
  ON public.workshops
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- profiles: admins can update any non-admin profile (e.g. disable)
-- (SELECT already covered by existing "Admins can view all profiles")
-- ============================================================
DROP POLICY IF EXISTS "Admins can update any user profile" ON public.profiles;
CREATE POLICY "Admins can update any user profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() AND role != 'admin')
  WITH CHECK (public.is_admin() AND role != 'admin');

-- ============================================================
-- mentor_applications: admins need to view/update skills too
-- ============================================================
DROP POLICY IF EXISTS "Admins can view mentor application skills" ON public.mentor_application_skills;
CREATE POLICY "Admins can view mentor application skills"
  ON public.mentor_application_skills
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update mentor application skills" ON public.mentor_application_skills;
CREATE POLICY "Admins can update mentor application skills"
  ON public.mentor_application_skills
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- mentor_verification_history: admins need INSERT for audit trail
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert verification history" ON public.mentor_verification_history;
CREATE POLICY "Admins can insert verification history"
  ON public.mentor_verification_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view verification history" ON public.mentor_verification_history;
CREATE POLICY "Admins can view verification history"
  ON public.mentor_verification_history
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- learner_profiles: ensure admins can read all learner profiles
-- (covered by existing "Admins can view all learner profiles" but
-- add update capability for admin moderation)
-- ============================================================
DROP POLICY IF EXISTS "Admins can update learner profiles" ON public.learner_profiles;
CREATE POLICY "Admins can update learner profiles"
  ON public.learner_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- notifications: allow admins to INSERT notifications for any user
-- (admin announcements)
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- ============================================================
-- skills: existing "Admins can insert or modify skills" covers ALL
-- but let's make DELETE explicit for admin skill management
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete skills" ON public.skills;
CREATE POLICY "Admins can delete skills"
  ON public.skills
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
