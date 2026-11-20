CREATE OR REPLACE FUNCTION public.record_mentor_onboarding_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_profile record;
  notification_key text;
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
      ON CONFLICT ON CONSTRAINT notifications_user_id_event_key_key DO NOTHING;

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
        ON CONFLICT ON CONSTRAINT notifications_user_id_event_key_key DO NOTHING;
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
      ON CONFLICT ON CONSTRAINT notifications_user_id_event_key_key DO NOTHING;
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
      ON CONFLICT ON CONSTRAINT notifications_user_id_event_key_key DO NOTHING;
    ELSIF NEW.status = 'approved' THEN
      INSERT INTO public.mentor_profiles (user_id, activated)
      VALUES (NEW.user_id, true)
      ON CONFLICT (user_id) DO UPDATE SET activated = true, updated_at = timezone('utc'::text, now());

      UPDATE public.profiles
      SET role = 'mentor', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.user_id;

      notification_key := 'mentor-approved:' || NEW.id || ':' || COALESCE(NEW.approved_at::text, NEW.updated_at::text);
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_application_id, event_key
      )
      VALUES (
        NEW.user_id,
        'mentor_approved',
        'Congratulations! You''ve been approved as a SkillSphere Mentor.',
        'Your competency and identity verification have been successfully completed. Welcome to the SkillSphere mentoring community! Your next step is to complete your professional mentor profile so learners can discover you and request your mentorship.',
        NEW.id,
        notification_key
      )
      ON CONFLICT ON CONSTRAINT notifications_user_id_event_key_key DO NOTHING;
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
    ON CONFLICT ON CONSTRAINT notifications_user_id_event_key_key DO NOTHING;
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
    ON CONFLICT ON CONSTRAINT notifications_user_id_event_key_key DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_mentor_onboarding_event() FROM PUBLIC, anon, authenticated;
