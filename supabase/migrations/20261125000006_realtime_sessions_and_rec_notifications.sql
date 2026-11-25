-- Migration: Add sessions to supabase_realtime publication and add recommendation notification trigger

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END;
$$;

-- Trigger: Notify student when an approved mentor submits a recommendation
CREATE OR REPLACE FUNCTION public.notify_on_student_recommendation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mentor_name text;
BEGIN
  SELECT COALESCE(NULLIF(trim(full_name), ''), split_part(email, '@', 1), 'A mentor')
    INTO v_mentor_name
  FROM public.profiles
  WHERE id = NEW.mentor_id;

  INSERT INTO public.notifications (
    user_id,
    notification_type,
    title,
    message,
    related_entity_id,
    event_key,
    read
  )
  VALUES (
    NEW.student_id,
    'recommendation_received',
    'New Mentor Recommendation',
    COALESCE(v_mentor_name, 'A mentor') || ' has written a professional recommendation for your profile. Review and accept it to display it publicly.',
    NEW.id,
    'rec_received:' || NEW.id::text,
    false
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_student_recommendation ON public.student_recommendations;
CREATE TRIGGER trg_notify_on_student_recommendation
AFTER INSERT ON public.student_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_student_recommendation();
