CREATE OR REPLACE FUNCTION public.submit_mentor_application_with_skills(
  application_id uuid,
  selected_skills jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = 'mentor'
  ) THEN
    RAISE EXCEPTION 'Only mentor accounts can submit mentor applications';
  END IF;

  IF selected_skills IS NULL
    OR jsonb_typeof(selected_skills) <> 'array'
    OR jsonb_array_length(selected_skills) = 0 THEN
    RAISE EXCEPTION 'At least one skill must be selected';
  END IF;

  SELECT count(*)
  INTO selected_count
  FROM jsonb_array_elements(selected_skills) AS skill
  WHERE nullif(trim(COALESCE(skill ->> 'skillId', '')), '') IS NOT NULL
    AND nullif(trim(COALESCE(skill ->> 'skillName', '')), '') IS NOT NULL;

  IF selected_count <> jsonb_array_length(selected_skills) THEN
    RAISE EXCEPTION 'Selected skills contain invalid skill data';
  END IF;

  IF (
    SELECT count(DISTINCT skill ->> 'skillId')
    FROM jsonb_array_elements(selected_skills) AS skill
  ) <> jsonb_array_length(selected_skills) THEN
    RAISE EXCEPTION 'Selected skills contain duplicate skill IDs';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.mentor_applications AS ma
    WHERE ma.id = submit_mentor_application_with_skills.application_id
      AND ma.user_id = auth.uid()
      AND ma.status IN ('not_applied', 'verification_failed')
  ) THEN
    RAISE EXCEPTION 'Application not found or cannot be submitted';
  END IF;

  DELETE FROM public.mentor_application_skills AS mas
  WHERE mas.application_id = submit_mentor_application_with_skills.application_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(selected_skills) AS skill
      WHERE skill ->> 'skillId' = mas.skill_id
    );

  INSERT INTO public.mentor_application_skills (
    application_id,
    skill_id,
    skill_name,
    evidence_data,
    status,
    feedback,
    reviewed_at
  )
  SELECT
    submit_mentor_application_with_skills.application_id,
    trim(skill ->> 'skillId'),
    trim(skill ->> 'skillName'),
    '[]'::jsonb,
    'pending',
    NULL,
    NULL
  FROM jsonb_array_elements(selected_skills) AS skill
  ON CONFLICT (application_id, skill_id)
  DO UPDATE
  SET
    skill_name = EXCLUDED.skill_name,
    status = CASE
      WHEN public.mentor_application_skills.status = 'verified'
        THEN public.mentor_application_skills.status
      ELSE 'pending'
    END;

  UPDATE public.mentor_applications AS ma
  SET status = 'pending_verification',
      identity_verified = false,
      competency_verified = false,
      admin_approved = false,
      rejection_reason = NULL,
      submitted_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
      updated_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
  WHERE ma.id = submit_mentor_application_with_skills.application_id
    AND ma.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mentor_application_with_skills(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mentor_application_with_skills(uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Users can create their own mentor application" ON public.mentor_applications;
CREATE POLICY "Mentors can create their own mentor application"
ON public.mentor_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = 'mentor'
  )
  AND status = 'not_applied'
  AND identity_verified = false
  AND competency_verified = false
  AND admin_approved = false
);
