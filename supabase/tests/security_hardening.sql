\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'learner@example.test', now(), '{}'::jsonb, '{"full_name":"Learner"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin@example.test', now(), '{}'::jsonb, '{"full_name":"Admin"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other@example.test', now(), '{}'::jsonb, '{"full_name":"Other"}'::jsonb, now(), now());

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
ALTER TABLE public.profiles DISABLE TRIGGER prevent_non_admin_profile_role_change;
UPDATE public.profiles
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000002';
ALTER TABLE public.profiles ENABLE TRIGGER prevent_non_admin_profile_role_change;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

DO $$
DECLARE
  visible_profiles integer;
BEGIN
  SELECT count(*) INTO visible_profiles FROM public.profiles;
  IF visible_profiles <> 1 THEN
    RAISE EXCEPTION 'RLS test failed: learner can see % profiles', visible_profiles;
  END IF;
END;
$$;

UPDATE public.profiles
SET full_name = 'Updated Learner'
WHERE id = '00000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  succeeded boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles SET role = 'admin'
    WHERE id = '00000000-0000-0000-0000-000000000001';
    succeeded := true;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  IF succeeded THEN
    RAISE EXCEPTION 'RLS test failed: learner changed profile role';
  END IF;
END;
$$;

INSERT INTO public.mentor_applications (id, user_id, professional_headline, biography, location)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mentor', 'Biography', 'Location');

INSERT INTO public.mentor_application_skills (application_id, skill_id, skill_name, evidence_data)
VALUES ('10000000-0000-0000-0000-000000000001', 'sql', 'SQL', '[{"url":"evidence.pdf"}]'::jsonb);

SELECT public.submit_mentor_application('10000000-0000-0000-0000-000000000001');

INSERT INTO storage.objects (id, bucket_id, name, owner_id, metadata)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'avatars',
  '00000000-0000-0000-0000-000000000001/avatar.png',
  '00000000-0000-0000-0000-000000000001',
  '{}'::jsonb
);

DO $$
DECLARE
  succeeded boolean := false;
BEGIN
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner_id, metadata)
    VALUES (
      '20000000-0000-0000-0000-000000000002',
      'avatars',
      '00000000-0000-0000-0000-000000000002/avatar.png',
      '00000000-0000-0000-0000-000000000001',
      '{}'::jsonb
    );
    succeeded := true;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  IF succeeded THEN
    RAISE EXCEPTION 'storage test failed: learner uploaded another user avatar';
  END IF;
END;
$$;

INSERT INTO storage.objects (id, bucket_id, name, owner_id, metadata)
VALUES (
  '20000000-0000-0000-0000-000000000003',
  'mentor-verification',
  '00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/evidence.pdf',
  '00000000-0000-0000-0000-000000000001',
  '{}'::jsonb
);

DO $$
DECLARE
  visible_objects integer;
BEGIN
  SELECT count(*) INTO visible_objects
  FROM storage.objects
  WHERE owner_id = '00000000-0000-0000-0000-000000000001';
  IF visible_objects <> 2 THEN
    RAISE EXCEPTION 'storage test failed: owner could not read own objects';
  END IF;
END;
$$;

DO $$
DECLARE
  succeeded boolean := false;
BEGIN
  BEGIN
    UPDATE public.mentor_application_skills
    SET evidence_data = '[{"url":"tampered.pdf"}]'::jsonb
    WHERE application_id = '10000000-0000-0000-0000-000000000001';
    succeeded := true;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  IF succeeded THEN
    RAISE EXCEPTION 'workflow test failed: submitted evidence was replaceable';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
UPDATE public.mentor_applications
SET status = 'pending_admin_approval',
    identity_verified = true,
    competency_verified = true
WHERE id = '10000000-0000-0000-0000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

DO $$
DECLARE
  succeeded boolean := false;
BEGIN
  BEGIN
    PERFORM public.admin_approve_mentor_application('10000000-0000-0000-0000-000000000001');
    succeeded := true;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  IF succeeded THEN
    RAISE EXCEPTION 'authorization test failed: learner approved an application';
  END IF;
END;
$$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
SELECT public.admin_approve_mentor_application('10000000-0000-0000-0000-000000000001');

DO $$
DECLARE
  application_status text;
  profile_role text;
BEGIN
  SELECT status INTO application_status
  FROM public.mentor_applications
  WHERE id = '10000000-0000-0000-0000-000000000001';
  SELECT role INTO profile_role
  FROM public.profiles
  WHERE id = '00000000-0000-0000-0000-000000000001';
  IF application_status <> 'approved' OR profile_role <> 'mentor' THEN
    RAISE EXCEPTION 'approval test failed: status %, role %', application_status, profile_role;
  END IF;
END;
$$;

ROLLBACK;
