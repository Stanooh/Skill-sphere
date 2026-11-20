CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_title text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  experience_years integer NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  education text NOT NULL DEFAULT '',
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability text NOT NULL DEFAULT 'unavailable'
    CHECK (availability IN ('available', 'limited', 'unavailable')),
  mentorship_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating numeric NOT NULL DEFAULT 0 CHECK (rating >= 0),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  profile_complete boolean NOT NULL DEFAULT false,
  activated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  related_application_id uuid REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  related_entity_id uuid,
  event_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, event_key)
);

ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_public_mentor_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_profiles AS mp
    JOIN public.mentor_applications AS ma ON ma.user_id = mp.user_id
    WHERE mp.user_id = profile_user_id
      AND mp.activated = true
      AND mp.profile_complete = true
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

REVOKE ALL ON FUNCTION public.is_public_mentor_profile(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_mentor_profile(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view eligible mentor identities" ON public.profiles;
CREATE POLICY "Public can view eligible mentor identities"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (public.is_public_mentor_profile(id));

GRANT SELECT (id, full_name, email) ON public.profiles TO anon;

DROP POLICY IF EXISTS "Public can view eligible mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Public can view eligible mentor profiles"
ON public.mentor_profiles
FOR SELECT
TO anon, authenticated
USING (public.is_public_mentor_profile(user_id));

DROP POLICY IF EXISTS "Mentors and admins can view mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Mentors and admins can view mentor profiles"
ON public.mentor_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Mentors can create their profile" ON public.mentor_profiles;
CREATE POLICY "Mentors can create their profile"
ON public.mentor_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND activated = false
);

DROP POLICY IF EXISTS "Mentors and admins can update mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Mentors and admins can update mentor profiles"
ON public.mentor_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark their notifications read" ON public.notifications;
CREATE POLICY "Users can mark their notifications read"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON TABLE public.mentor_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.mentor_profiles TO anon, authenticated;
GRANT INSERT ON TABLE public.mentor_profiles TO authenticated;
GRANT UPDATE (
  professional_title,
  bio,
  location,
  experience_years,
  education,
  certifications,
  availability,
  mentorship_areas,
  skill_ids,
  profile_complete,
  updated_at
) ON TABLE public.mentor_profiles TO authenticated;

REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read) ON TABLE public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.record_mentor_onboarding_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_profile record;
  event_key text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'pending_verification' THEN
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_application_id, event_key
      )
      VALUES (
        NEW.user_id,
        'application_submitted',
        'Application submitted',
        'Your mentor application is now awaiting identity and competency review.',
        NEW.id,
        'mentor-application-submitted:' || NEW.id || ':' || COALESCE(NEW.submitted_at::text, '')
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;

      FOR admin_profile IN
        SELECT p.id FROM public.profiles AS p WHERE p.role = 'admin'
      LOOP
        INSERT INTO public.notifications (
          user_id, notification_type, title, message, related_application_id, event_key
        )
        VALUES (
          admin_profile.id,
          'application_review_required',
          'New mentor application',
          'A mentor application is ready for identity and competency review.',
          NEW.id,
          'admin-mentor-application-submitted:' || NEW.id || ':' || COALESCE(NEW.submitted_at::text, '')
        )
        ON CONFLICT (user_id, event_key) DO NOTHING;
      END LOOP;
    ELSIF NEW.status = 'pending_admin_approval' THEN
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_application_id, event_key
      )
      VALUES (
        NEW.user_id,
        'competency_verified',
        'Competency verification passed',
        'Your competency verification passed. Your application is ready for final administrator approval.',
        NEW.id,
        'mentor-competency-passed:' || NEW.id
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;
    ELSIF NEW.status IN ('verification_failed', 'rejected', 'suspended') THEN
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_application_id, event_key
      )
      VALUES (
        NEW.user_id,
        'application_status_changed',
        CASE NEW.status
          WHEN 'verification_failed' THEN 'Verification needs attention'
          WHEN 'rejected' THEN 'Mentor application rejected'
          ELSE 'Mentor access suspended'
        END,
        COALESCE(NEW.rejection_reason, 'Your mentor application status has changed.'),
        NEW.id,
        'mentor-application-status:' || NEW.id || ':' || NEW.status || ':' || COALESCE(NEW.updated_at::text, '')
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;
    ELSIF NEW.status = 'approved' THEN
      INSERT INTO public.mentor_profiles (user_id, activated)
      VALUES (NEW.user_id, true)
      ON CONFLICT (user_id) DO UPDATE SET activated = true, updated_at = timezone('utc'::text, now());

      UPDATE public.profiles
      SET role = 'mentor', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.user_id;

      event_key := 'mentor-approved:' || NEW.id || ':' || COALESCE(NEW.approved_at::text, NEW.updated_at::text);
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_application_id, event_key
      )
      VALUES (
        NEW.user_id,
        'mentor_approved',
        'Congratulations! You''ve been approved as a SkillSphere Mentor.',
        'Your competency and identity verification have been successfully completed. Welcome to the SkillSphere mentoring community! Your next step is to complete your professional mentor profile so learners can discover you and request your mentorship.',
        NEW.id,
        event_key
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;
    END IF;
  END IF;

  IF OLD.identity_verified IS DISTINCT FROM NEW.identity_verified THEN
    INSERT INTO public.notifications (
      user_id, notification_type, title, message, related_application_id, event_key
    )
    VALUES (
      NEW.user_id,
      'identity_verification',
      CASE WHEN NEW.identity_verified THEN 'Identity verification passed' ELSE 'Identity verification failed' END,
      COALESCE(NEW.rejection_reason, 'Your identity verification result is now available.'),
      NEW.id,
      'mentor-identity:' || NEW.id || ':' || NEW.identity_verified
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;
  END IF;

  IF OLD.competency_verified IS DISTINCT FROM NEW.competency_verified
    AND NEW.status <> 'pending_admin_approval' THEN
    INSERT INTO public.notifications (
      user_id, notification_type, title, message, related_application_id, event_key
    )
    VALUES (
      NEW.user_id,
      'competency_verification',
      CASE WHEN NEW.competency_verified THEN 'Competency verification passed' ELSE 'Competency verification failed' END,
      COALESCE(NEW.rejection_reason, 'Your competency verification result is now available.'),
      NEW.id,
      'mentor-competency:' || NEW.id || ':' || NEW.competency_verified
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_mentor_onboarding_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mentor_onboarding_event ON public.mentor_applications;
CREATE TRIGGER mentor_onboarding_event
AFTER UPDATE ON public.mentor_applications
FOR EACH ROW
EXECUTE FUNCTION public.record_mentor_onboarding_event();

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mentor_profiles_discovery_idx
ON public.mentor_profiles (activated, profile_complete, availability);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
