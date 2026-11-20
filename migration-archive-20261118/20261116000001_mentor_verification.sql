-- Persist mentor applications, evidence, and review history in Supabase.
-- This migration does not alter the existing profiles schema or role values.

CREATE TABLE IF NOT EXISTS public.mentor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_applied'
    CHECK (status IN (
      'not_applied',
      'pending_verification',
      'verification_failed',
      'pending_admin_approval',
      'approved',
      'rejected',
      'suspended'
    )),
  professional_headline TEXT NOT NULL DEFAULT '',
  biography TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  competency_verified BOOLEAN NOT NULL DEFAULT false,
  admin_approved BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.mentor_application_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  evidence_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('not-submitted', 'pending', 'verified', 'rejected', 'needs-evidence')),
  feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (application_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.mentor_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_application_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_verification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants and admins can view mentor applications" ON public.mentor_applications;
CREATE POLICY "Applicants and admins can view mentor applications"
ON public.mentor_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create their own mentor application" ON public.mentor_applications;
CREATE POLICY "Users can create their own mentor application"
ON public.mentor_applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'not_applied'
  AND identity_verified = false
  AND competency_verified = false
  AND admin_approved = false
);

DROP POLICY IF EXISTS "Applicants and admins can update mentor applications" ON public.mentor_applications;
CREATE POLICY "Applicants and admins can update mentor applications"
ON public.mentor_applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Applicants and admins can view application skills" ON public.mentor_application_skills;
CREATE POLICY "Applicants and admins can view application skills"
ON public.mentor_application_skills FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Applicants can create application skills" ON public.mentor_application_skills;
CREATE POLICY "Applicants can create application skills"
ON public.mentor_application_skills FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND feedback IS NULL
  AND reviewed_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.mentor_applications application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Applicants and admins can update application skills" ON public.mentor_application_skills;
CREATE POLICY "Applicants and admins can update application skills"
ON public.mentor_application_skills FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Applicants and admins can view verification history" ON public.mentor_verification_history;
CREATE POLICY "Applicants and admins can view verification history"
ON public.mentor_verification_history FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.record_mentor_verification_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_text TEXT;
  action_note TEXT;
  actor UUID := auth.uid();
BEGIN
  IF TG_TABLE_NAME = 'mentor_applications' THEN
    IF TG_OP = 'INSERT' THEN
      action_text := 'Application created';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      action_text := 'Application status changed to ' || replace(NEW.status, '_', ' ');
      action_note := NEW.rejection_reason;
    ELSIF OLD.identity_verified IS DISTINCT FROM NEW.identity_verified THEN
      action_text := CASE WHEN NEW.identity_verified THEN 'Identity verified' ELSE 'Identity verification failed' END;
      action_note := NEW.rejection_reason;
    ELSIF OLD.competency_verified IS DISTINCT FROM NEW.competency_verified THEN
      action_text := CASE WHEN NEW.competency_verified THEN 'Competency verification passed' ELSE 'Competency verification failed' END;
      action_note := NEW.rejection_reason;
    ELSE
      RETURN NEW;
    END IF;
    INSERT INTO public.mentor_verification_history (application_id, action, actor_id, note)
    VALUES (NEW.id, action_text, actor, action_note);
  ELSE
    IF TG_OP = 'INSERT' THEN
      action_text := 'Skill evidence submitted';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      action_text := 'Skill "' || NEW.skill_name || '" marked ' || replace(NEW.status, '-', ' ');
      action_note := NEW.feedback;
    ELSE
      RETURN NEW;
    END IF;
    INSERT INTO public.mentor_verification_history (application_id, action, actor_id, note)
    VALUES (NEW.application_id, action_text, actor, action_note);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_mentor_verification_history() FROM PUBLIC;

DROP TRIGGER IF EXISTS mentor_application_history ON public.mentor_applications;
CREATE TRIGGER mentor_application_history
AFTER INSERT OR UPDATE ON public.mentor_applications
FOR EACH ROW EXECUTE FUNCTION public.record_mentor_verification_history();

DROP TRIGGER IF EXISTS mentor_application_skill_history ON public.mentor_application_skills;
CREATE TRIGGER mentor_application_skill_history
AFTER INSERT OR UPDATE ON public.mentor_application_skills
FOR EACH ROW EXECUTE FUNCTION public.record_mentor_verification_history();

CREATE OR REPLACE FUNCTION public.protect_mentor_application_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS DISTINCT FROM NEW.user_id
    OR OLD.identity_verified IS DISTINCT FROM NEW.identity_verified
    OR OLD.competency_verified IS DISTINCT FROM NEW.competency_verified
    OR OLD.admin_approved IS DISTINCT FROM NEW.admin_approved
    OR OLD.created_at IS DISTINCT FROM NEW.created_at
    OR (
      OLD.submitted_at IS DISTINCT FROM NEW.submitted_at
      AND NOT (
        OLD.status IN ('not_applied', 'verification_failed')
        AND NEW.status = 'pending_verification'
      )
    )
    OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
    OR OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by
    OR OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason THEN
    RAISE EXCEPTION 'Only an administrator can change mentor review fields';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
    AND NOT (
      OLD.status IN ('not_applied', 'verification_failed')
      AND NEW.status = 'pending_verification'
      AND NEW.submitted_at IS NOT NULL
    ) THEN
    RAISE EXCEPTION 'Invalid mentor application status transition';
  END IF;

  IF OLD.status NOT IN ('not_applied', 'verification_failed')
    AND (
      OLD.professional_headline IS DISTINCT FROM NEW.professional_headline
      OR OLD.biography IS DISTINCT FROM NEW.biography
      OR OLD.location IS DISTINCT FROM NEW.location
      OR OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url
      OR OLD.github_url IS DISTINCT FROM NEW.github_url
      OR OLD.portfolio_url IS DISTINCT FROM NEW.portfolio_url
    ) THEN
    RAISE EXCEPTION 'This mentor application is no longer editable';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_mentor_application_changes() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_mentor_application_changes ON public.mentor_applications;
CREATE TRIGGER protect_mentor_application_changes
BEFORE UPDATE ON public.mentor_applications
FOR EACH ROW EXECUTE FUNCTION public.protect_mentor_application_changes();

CREATE OR REPLACE FUNCTION public.protect_mentor_application_skill_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'verified' THEN
    RAISE EXCEPTION 'Verified mentor skill evidence cannot be changed by an applicant';
  END IF;

  IF OLD.application_id IS DISTINCT FROM NEW.application_id
    OR OLD.skill_id IS DISTINCT FROM NEW.skill_id
    OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Only an administrator can move mentor skill records';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status <> 'pending' THEN
    RAISE EXCEPTION 'Only an administrator can review mentor skill evidence';
  END IF;

  IF OLD.feedback IS DISTINCT FROM NEW.feedback
    OR OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at THEN
    RAISE EXCEPTION 'Only an administrator can change mentor skill review fields';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_mentor_application_skill_changes() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_mentor_application_skill_changes ON public.mentor_application_skills;
CREATE TRIGGER protect_mentor_application_skill_changes
BEFORE UPDATE ON public.mentor_application_skills
FOR EACH ROW EXECUTE FUNCTION public.protect_mentor_application_skill_changes();

CREATE OR REPLACE FUNCTION public.submit_mentor_application(application_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.mentor_applications
    WHERE id = application_id
      AND user_id = auth.uid()
      AND status IN ('not_applied', 'verification_failed')
  ) THEN
    RAISE EXCEPTION 'Application not found or cannot be submitted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.mentor_application_skills
    WHERE mentor_application_skills.application_id = submit_mentor_application.application_id
      AND jsonb_array_length(evidence_data) > 0
  ) THEN
    RAISE EXCEPTION 'At least one skill must include evidence';
  END IF;

  UPDATE public.mentor_applications
  SET status = 'pending_verification',
      identity_verified = false,
      competency_verified = false,
      admin_approved = false,
      rejection_reason = NULL,
      submitted_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = submit_mentor_application.application_id
    AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mentor_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_mentor_application(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_mentor_application(application_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  applicant_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT user_id INTO applicant_id
  FROM public.mentor_applications
  WHERE id = application_id
    AND competency_verified = true
    AND status <> 'suspended'
  FOR UPDATE;

  IF applicant_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or competency verification has not passed';
  END IF;

  UPDATE public.mentor_applications
  SET status = 'approved',
      admin_approved = true,
      approved_at = timezone('utc'::text, now()),
      reviewed_by = auth.uid(),
      updated_at = timezone('utc'::text, now())
  WHERE id = application_id;

  UPDATE public.profiles
  SET role = 'mentor',
      updated_at = timezone('utc'::text, now())
  WHERE id = applicant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_mentor_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_mentor_application(UUID) TO authenticated;
