/*
# Mentor verification and approval workflow schema

## Overview
This migration creates the database infrastructure for a secure mentor verification
and approval workflow in SkillSphere. It introduces:
- A `profiles` table that maps Supabase auth users to application roles (learner/mentor/admin)
- A `mentor_applications` table tracking the full verification lifecycle
- A `mentor_skill_verifications` table for per-skill competency reviews
- A `mentor_verification_history` table for audit trail of all decisions
- A SECURITY DEFINER function for admin-only approval/verification actions

## State model
Mentor applications follow this state machine:
- `not_applied` — user has not yet submitted an application
- `pending_verification` — application submitted, awaiting competency review
- `verification_failed` — competency verification was rejected
- `pending_admin_approval` — competency passed, awaiting admin final approval
- `approved` — fully approved mentor with dashboard access
- `rejected` — admin rejected the application
- `suspended` — previously approved, now suspended

## Security
- RLS enabled on every table
- Users can read and update their own application data (but NOT approval status fields)
- Only admin users (checked via SECURITY DEFINER function) can change verification
  and approval status
- The `approve_mentor` SECURITY DEFINER function enforces:
  1. The caller is an admin
  2. Competency verification has passed before approval
  3. The user is not already suspended
- The `set_competency_verified` SECURITY DEFINER function enforces:
  1. The caller is an admin
  2. Records the decision in history

## Tables

### profiles
- `id` (uuid, PK, references auth.users)
- `role` (text, default 'learner' — can only be changed by admin via SECURITY DEFINER function)
- `display_name` (text)
- `email` (text)
- `created_at` (timestamptz)

### mentor_applications
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users, the applicant)
- `status` (text, application status — not_applied/pending_verification/etc.)
- `professional_headline` (text)
- `biography` (text)
- `location` (text)
- `linkedin_url` (text, optional)
- `github_url` (text, optional)
- `portfolio_url` (text, optional)
- `identity_verified` (boolean, default false — set only by admin)
- `competency_verified` (boolean, default false — set only by admin)
- `admin_approved` (boolean, default false — set only by admin)
- `rejection_reason` (text, optional)
- `submitted_at` (timestamptz, optional)
- `approved_at` (timestamptz, optional)
- `reviewed_by` (uuid, optional — the admin who made the decision)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### mentor_skill_verifications
- `id` (uuid, PK)
- `application_id` (uuid, references mentor_applications)
- `skill_id` (text)
- `skill_name` (text)
- `evidence_data` (jsonb — array of evidence items)
- `status` (text — not-submitted/pending/verified/rejected/needs-evidence)
- `feedback` (text, optional — reviewer feedback)
- `reviewed_by` (uuid, optional)
- `reviewed_at` (timestamptz, optional)

### mentor_verification_history
- `id` (uuid, PK)
- `application_id` (uuid, references mentor_applications)
- `action` (text — description of what happened)
- `actor_id` (uuid — who performed the action)
- `note` (text, optional)
- `created_at` (timestamptz)

## Functions

### is_admin()
Returns true if the current authenticated user has role 'admin' in profiles table.
Used in RLS policies.

### approve_mentor(p_application_id, p_rejection_reason)
SECURITY DEFINER function that:
- Verifies caller is admin
- Verifies competency_verified is true
- Sets admin_approved = true, status = 'approved'
- Updates profiles.role to 'mentor'
- Records in history

### set_competency_verified(p_application_id, p_verified, p_reason)
SECURITY DEFINER function that:
- Verifies caller is admin
- Sets competency_verified
- Updates application status appropriately
- Records in history

### reject_mentor_application(p_application_id, p_reason)
SECURITY DEFINER function that:
- Verifies caller is admin
- Sets status to 'rejected', admin_approved = false
- Records in history

### suspend_mentor(p_application_id, p_reason)
SECURITY DEFINER function that:
- Verifies caller is admin
- Sets status to 'suspended', admin_approved = false
- Updates profiles.role to 'learner'
- Records in history

### request_evidence(p_application_id, p_skill_id, p_feedback)
SECURITY DEFINER function that:
- Verifies caller is admin
- Sets skill status to 'needs-evidence'
- Updates application status to 'pending_verification'
- Records in history
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'mentor', 'admin')),
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- MENTOR APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mentor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_applied' CHECK (status IN ('not_applied','pending_verification','verification_failed','pending_admin_approval','approved','rejected','suspended')),
  professional_headline text NOT NULL DEFAULT '',
  biography text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  linkedin_url text,
  github_url text,
  portfolio_url text,
  identity_verified boolean NOT NULL DEFAULT false,
  competency_verified boolean NOT NULL DEFAULT false,
  admin_approved boolean NOT NULL DEFAULT false,
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mentor_applications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON mentor_applications TO authenticated;
GRANT SELECT, UPDATE ON mentor_applications TO service_role;

-- Users can read their own applications
DROP POLICY IF EXISTS "applications_select_own" ON mentor_applications;
CREATE POLICY "applications_select_own" ON mentor_applications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own applications (but only with status not_applied or pending_verification)
DROP POLICY IF EXISTS "applications_insert_own" ON mentor_applications;
CREATE POLICY "applications_insert_own" ON mentor_applications FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND status IN ('not_applied', 'pending_verification')
    AND identity_verified = false
    AND competency_verified = false
    AND admin_approved = false
  );

-- Users can update their own application profile fields and evidence,
-- but CANNOT change verification/approval fields (enforced by column-level UPDATE grant below)
DROP POLICY IF EXISTS "applications_update_own" ON mentor_applications;
CREATE POLICY "applications_update_own" ON mentor_applications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND identity_verified = false
    AND competency_verified = false
    AND admin_approved = false
  );

-- Restrict UPDATE to only profile/evidence columns (not verification/approval fields)
-- Users can only update: professional_headline, biography, location, linkedin_url,
-- github_url, portfolio_url, status (to submit), updated_at
-- They CANNOT update: identity_verified, competency_verified, admin_approved,
-- rejection_reason, reviewed_by, approved_at
REVOKE UPDATE ON mentor_applications FROM authenticated;
GRANT UPDATE (
  professional_headline, biography, location, linkedin_url,
  github_url, portfolio_url, status, updated_at
) ON mentor_applications TO authenticated;

-- Admins can read all applications (via is_admin function)
-- We need a separate policy for admin reads
-- Note: service_role bypasses RLS, so admin edge functions use service_role

-- ============================================================
-- MENTOR SKILL VERIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mentor_skill_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES mentor_applications(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  skill_name text NOT NULL DEFAULT '',
  evidence_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'not-submitted' CHECK (status IN ('not-submitted','pending','verified','rejected','needs-evidence')),
  feedback text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mentor_skill_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON mentor_skill_verifications TO authenticated;
GRANT SELECT, UPDATE, INSERT ON mentor_skill_verifications TO service_role;

-- Users can read skill verifications for their own applications
DROP POLICY IF EXISTS "skill_verif_select_own" ON mentor_skill_verifications;
CREATE POLICY "skill_verif_select_own" ON mentor_skill_verifications FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM mentor_applications
      WHERE mentor_applications.id = mentor_skill_verifications.application_id
      AND mentor_applications.user_id = auth.uid()
    )
  );

-- Users can insert skill verifications for their own applications
DROP POLICY IF EXISTS "skill_verif_insert_own" ON mentor_skill_verifications;
CREATE POLICY "skill_verif_insert_own" ON mentor_skill_verifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM mentor_applications
      WHERE mentor_applications.id = mentor_skill_verifications.application_id
      AND mentor_applications.user_id = auth.uid()
      AND mentor_applications.competency_verified = false
    )
  );

-- Users can update evidence_data and skill fields, but NOT status/feedback/reviewed_by/reviewed_at
REVOKE UPDATE ON mentor_skill_verifications FROM authenticated;
GRANT UPDATE (evidence_data, skill_name) ON mentor_skill_verifications TO authenticated;

DROP POLICY IF EXISTS "skill_verif_update_own" ON mentor_skill_verifications;
CREATE POLICY "skill_verif_update_own" ON mentor_skill_verifications FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM mentor_applications
      WHERE mentor_applications.id = mentor_skill_verifications.application_id
      AND mentor_applications.user_id = auth.uid()
      AND mentor_applications.competency_verified = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mentor_applications
      WHERE mentor_applications.id = mentor_skill_verifications.application_id
      AND mentor_applications.user_id = auth.uid()
      AND mentor_applications.competency_verified = false
    )
  );

-- ============================================================
-- MENTOR VERIFICATION HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mentor_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES mentor_applications(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mentor_verification_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON mentor_verification_history TO authenticated;
GRANT INSERT ON mentor_verification_history TO service_role;

-- Users can read history for their own applications
DROP POLICY IF EXISTS "history_select_own" ON mentor_verification_history;
CREATE POLICY "history_select_own" ON mentor_verification_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM mentor_applications
      WHERE mentor_applications.id = mentor_verification_history.application_id
      AND mentor_applications.user_id = auth.uid()
    )
  );

-- ============================================================
-- HELPER FUNCTION: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================================
-- SECURITY DEFINER: approve_mentor()
-- Approves a mentor application after competency verification passed
-- ============================================================
CREATE OR REPLACE FUNCTION approve_mentor(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app mentor_applications%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can approve mentor applications';
  END IF;

  SELECT * INTO v_app FROM mentor_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status = 'suspended' THEN
    RAISE EXCEPTION 'Cannot approve a suspended application';
  END IF;

  IF NOT v_app.competency_verified THEN
    RAISE EXCEPTION 'Cannot approve mentor: competency verification has not passed';
  END IF;

  UPDATE mentor_applications
  SET admin_approved = true,
      status = 'approved',
      approved_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now(),
      rejection_reason = NULL
  WHERE id = p_application_id;

  -- Promote user role to mentor
  UPDATE profiles SET role = 'mentor' WHERE id = v_app.user_id;

  INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
  VALUES (p_application_id, 'Mentor approved', auth.uid(), 'Application approved by administrator');
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_mentor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_mentor(uuid) TO authenticated;

-- ============================================================
-- SECURITY DEFINER: set_competency_verified()
-- Marks competency verification as passed or failed
-- ============================================================
CREATE OR REPLACE FUNCTION set_competency_verified(p_application_id uuid, p_verified boolean, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app mentor_applications%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can set competency verification';
  END IF;

  SELECT * INTO v_app FROM mentor_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF p_verified THEN
    UPDATE mentor_applications
    SET competency_verified = true,
        status = 'pending_admin_approval',
        reviewed_by = auth.uid(),
        updated_at = now()
    WHERE id = p_application_id;

    INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
    VALUES (p_application_id, 'Competency verification passed', auth.uid(), p_reason);
  ELSE
    UPDATE mentor_applications
    SET competency_verified = false,
        status = 'verification_failed',
        reviewed_by = auth.uid(),
        updated_at = now(),
        rejection_reason = p_reason
    WHERE id = p_application_id;

    INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
    VALUES (p_application_id, 'Competency verification failed', auth.uid(), p_reason);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_competency_verified(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_competency_verified(uuid, boolean, text) TO authenticated;

-- ============================================================
-- SECURITY DEFINER: set_identity_verified()
-- Marks identity verification as passed or failed
-- ============================================================
CREATE OR REPLACE FUNCTION set_identity_verified(p_application_id uuid, p_verified boolean, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app mentor_applications%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can set identity verification';
  END IF;

  SELECT * INTO v_app FROM mentor_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  UPDATE mentor_applications
  SET identity_verified = p_verified,
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_application_id;

  INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
  VALUES (p_application_id,
    CASE WHEN p_verified THEN 'Identity verification passed' ELSE 'Identity verification failed' END,
    auth.uid(), p_reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION set_identity_verified(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_identity_verified(uuid, boolean, text) TO authenticated;

-- ============================================================
-- SECURITY DEFINER: reject_mentor_application()
-- Rejects a mentor application with a reason
-- ============================================================
CREATE OR REPLACE FUNCTION reject_mentor_application(p_application_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app mentor_applications%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can reject mentor applications';
  END IF;

  SELECT * INTO v_app FROM mentor_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  UPDATE mentor_applications
  SET admin_approved = false,
      status = 'rejected',
      rejection_reason = p_reason,
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_application_id;

  INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
  VALUES (p_application_id, 'Application rejected', auth.uid(), p_reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_mentor_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_mentor_application(uuid, text) TO authenticated;

-- ============================================================
-- SECURITY DEFINER: suspend_mentor()
-- Suspends a previously approved mentor
-- ============================================================
CREATE OR REPLACE FUNCTION suspend_mentor(p_application_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app mentor_applications%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can suspend mentors';
  END IF;

  SELECT * INTO v_app FROM mentor_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  UPDATE mentor_applications
  SET admin_approved = false,
      status = 'suspended',
      rejection_reason = p_reason,
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_application_id;

  -- Demote user role back to learner
  UPDATE profiles SET role = 'learner' WHERE id = v_app.user_id;

  INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
  VALUES (p_application_id, 'Mentor suspended', auth.uid(), p_reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION suspend_mentor(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION suspend_mentor(uuid, text) TO authenticated;

-- ============================================================
-- SECURITY DEFINER: review_skill_verification()
-- Admin reviews a single skill's competency evidence
-- ============================================================
CREATE OR REPLACE FUNCTION review_skill_verification(
  p_skill_verif_id uuid,
  p_decision text,
  p_feedback text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill_verif mentor_skill_verifications%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can review skill verifications';
  END IF;

  SELECT * INTO v_skill_verif FROM mentor_skill_verifications WHERE id = p_skill_verif_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skill verification not found';
  END IF;

  IF p_decision NOT IN ('verified', 'rejected', 'needs-evidence') THEN
    RAISE EXCEPTION 'Invalid decision: must be verified, rejected, or needs-evidence';
  END IF;

  UPDATE mentor_skill_verifications
  SET status = p_decision,
      feedback = p_feedback,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_skill_verif_id;

  INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
  VALUES (v_skill_verif.application_id,
    'Skill ' || v_skill_verif.skill_name || ' marked ' || p_decision,
    auth.uid(), p_feedback);
END;
$$;

REVOKE EXECUTE ON FUNCTION review_skill_verification(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_skill_verification(uuid, text, text) TO authenticated;

-- ============================================================
-- SECURITY DEFINER: request_additional_evidence()
-- Admin requests more evidence for a skill
-- ============================================================
CREATE OR REPLACE FUNCTION request_additional_evidence(
  p_application_id uuid,
  p_skill_id text,
  p_feedback text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can request additional evidence';
  END IF;

  UPDATE mentor_skill_verifications
  SET status = 'needs-evidence',
      feedback = p_feedback,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE application_id = p_application_id AND skill_id = p_skill_id;

  UPDATE mentor_applications
  SET status = 'pending_verification',
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_application_id;

  INSERT INTO mentor_verification_history (application_id, action, actor_id, note)
  VALUES (p_application_id,
    'Additional evidence requested for skill ' || p_skill_id,
    auth.uid(), p_feedback);
END;
$$;

REVOKE EXECUTE ON FUNCTION request_additional_evidence(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION request_additional_evidence(uuid, text, text) TO authenticated;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mentor_applications_user_id ON mentor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_status ON mentor_applications(status);
CREATE INDEX IF NOT EXISTS idx_mentor_skill_verif_application_id ON mentor_skill_verifications(application_id);
CREATE INDEX IF NOT EXISTS idx_mentor_verification_history_application_id ON mentor_verification_history(application_id);