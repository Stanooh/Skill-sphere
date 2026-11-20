-- Skill selection is sufficient to submit a competency application.
-- Existing evidence data remains available as optional supporting information.
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
  ) THEN
    RAISE EXCEPTION 'At least one skill must be selected';
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
