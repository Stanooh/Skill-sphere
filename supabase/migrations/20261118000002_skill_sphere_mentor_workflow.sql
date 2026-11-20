CREATE OR REPLACE FUNCTION public.record_mentor_verification_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  action_text text;
  action_note text;
BEGIN
  IF TG_TABLE_NAME = 'mentor_applications' THEN
    IF TG_OP = 'INSERT' THEN
      action_text := 'Application created';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      action_text := 'Application status changed to ' || replace(NEW.status, '_', ' ');
      action_note := NEW.rejection_reason;
    ELSIF OLD.identity_verified IS DISTINCT FROM NEW.identity_verified THEN
      action_text := CASE
        WHEN NEW.identity_verified THEN 'Identity verified'
        ELSE 'Identity verification failed'
      END;
      action_note := NEW.rejection_reason;
    ELSIF OLD.competency_verified IS DISTINCT FROM NEW.competency_verified THEN
      action_text := CASE
        WHEN NEW.competency_verified THEN 'Competency verification passed'
        ELSE 'Competency verification failed'
      END;
      action_note := NEW.rejection_reason;
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.mentor_verification_history (
      application_id,
      action,
      actor_id,
      note
    )
    VALUES (NEW.id, action_text, auth.uid(), action_note);
  ELSE
    IF TG_OP = 'INSERT' THEN
      action_text := 'Skill evidence submitted';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      action_text := 'Skill "' || NEW.skill_name || '" marked '
        || replace(NEW.status, '-', ' ');
      action_note := NEW.feedback;
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.mentor_verification_history (
      application_id,
      action,
      actor_id,
      note
    )
    VALUES (NEW.application_id, action_text, auth.uid(), action_note);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_mentor_verification_history() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_mentor_application_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
    OR OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by
    OR OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason
    OR (
      OLD.submitted_at IS DISTINCT FROM NEW.submitted_at
      AND NOT (
        OLD.status IN ('not_applied', 'verification_failed')
        AND NEW.status = 'pending_verification'
      )
    ) THEN
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

REVOKE ALL ON FUNCTION public.protect_mentor_application_changes() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_mentor_application_skill_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  application_status text;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.application_id IS DISTINCT FROM NEW.application_id
    OR OLD.skill_id IS DISTINCT FROM NEW.skill_id
    OR OLD.skill_name IS DISTINCT FROM NEW.skill_name
    OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Only an administrator can change mentor skill identity';
  END IF;

  IF OLD.feedback IS DISTINCT FROM NEW.feedback
    OR OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at THEN
    RAISE EXCEPTION 'Only an administrator can change mentor skill review fields';
  END IF;

  SELECT ma.status
  INTO application_status
  FROM public.mentor_applications AS ma
  WHERE ma.id = OLD.application_id
    AND ma.user_id = auth.uid();

  IF application_status IS NULL THEN
    RAISE EXCEPTION 'Mentor application ownership could not be verified';
  END IF;

  IF OLD.status = 'verified' THEN
    RAISE EXCEPTION 'Verified mentor skill evidence cannot be changed by an applicant';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
    AND NOT (
      (
        application_status IN ('not_applied', 'verification_failed')
        AND NEW.status = 'pending'
      )
      OR (
        application_status = 'pending_verification'
        AND OLD.status = 'needs-evidence'
        AND NEW.status = 'pending'
      )
    ) THEN
    RAISE EXCEPTION 'Invalid applicant skill status transition';
  END IF;

  IF OLD.evidence_data IS DISTINCT FROM NEW.evidence_data
    AND NOT (
      application_status IN ('not_applied', 'verification_failed')
      OR (
        application_status = 'pending_verification'
        AND OLD.status = 'needs-evidence'
      )
    ) THEN
    RAISE EXCEPTION 'Mentor evidence is immutable after submission';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_mentor_application_skill_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mentor_application_history ON public.mentor_applications;
CREATE TRIGGER mentor_application_history
AFTER INSERT OR UPDATE ON public.mentor_applications
FOR EACH ROW
EXECUTE FUNCTION public.record_mentor_verification_history();

DROP TRIGGER IF EXISTS mentor_application_skill_history ON public.mentor_application_skills;
CREATE TRIGGER mentor_application_skill_history
AFTER INSERT OR UPDATE ON public.mentor_application_skills
FOR EACH ROW
EXECUTE FUNCTION public.record_mentor_verification_history();

DROP TRIGGER IF EXISTS protect_mentor_application_changes ON public.mentor_applications;
CREATE TRIGGER protect_mentor_application_changes
BEFORE UPDATE ON public.mentor_applications
FOR EACH ROW
EXECUTE FUNCTION public.protect_mentor_application_changes();

DROP TRIGGER IF EXISTS protect_mentor_application_skill_changes ON public.mentor_application_skills;
CREATE TRIGGER protect_mentor_application_skill_changes
BEFORE UPDATE ON public.mentor_application_skills
FOR EACH ROW
EXECUTE FUNCTION public.protect_mentor_application_skill_changes();

CREATE OR REPLACE FUNCTION public.submit_mentor_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.mentor_applications AS ma
    WHERE ma.id = submit_mentor_application.application_id
      AND ma.user_id = auth.uid()
      AND ma.status IN ('not_applied', 'verification_failed')
  ) THEN
    RAISE EXCEPTION 'Application not found or cannot be submitted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.mentor_application_skills AS mas
    WHERE mas.application_id = submit_mentor_application.application_id
      AND pg_catalog.jsonb_array_length(mas.evidence_data) > 0
  ) THEN
    RAISE EXCEPTION 'At least one skill must include evidence';
  END IF;

  UPDATE public.mentor_applications AS ma
  SET status = 'pending_verification',
      identity_verified = false,
      competency_verified = false,
      admin_approved = false,
      rejection_reason = NULL,
      submitted_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
      updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
  WHERE ma.id = submit_mentor_application.application_id
    AND ma.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mentor_application(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mentor_application(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_mentor_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  applicant_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT ma.user_id
  INTO applicant_id
  FROM public.mentor_applications AS ma
  WHERE ma.id = admin_approve_mentor_application.application_id
    AND ma.status = 'pending_admin_approval'
    AND ma.identity_verified = true
    AND ma.competency_verified = true
    AND ma.admin_approved = false
  FOR UPDATE;

  IF applicant_id IS NULL THEN
    RAISE EXCEPTION 'Application is not eligible for administrator approval';
  END IF;

  UPDATE public.mentor_applications AS ma
  SET status = 'approved',
      admin_approved = true,
      approved_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
      reviewed_by = auth.uid(),
      updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
  WHERE ma.id = admin_approve_mentor_application.application_id
    AND ma.status = 'pending_admin_approval'
    AND ma.identity_verified = true
    AND ma.competency_verified = true
    AND ma.admin_approved = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application approval update failed';
  END IF;

  UPDATE public.profiles AS p
  SET role = 'mentor',
      updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
  WHERE p.id = applicant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_mentor_application(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_mentor_application(uuid) TO authenticated;
