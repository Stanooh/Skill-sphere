-- Migration: Fix create_notification (event_key + uuid cast) and add server-side notification triggers
-- Ensures all message and mentorship request notifications are generated reliably in Postgres
-- with deduplication via (user_id, event_key) and without client-side insert privileges.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id    uuid,
  p_type       text,
  p_title      text,
  p_message    text,
  p_entity_id  text DEFAULT NULL,
  p_event_key  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_allowed_types text[] := ARRAY[
    'mentorship_request',
    'session_accepted',
    'session_declined',
    'session_cancelled',
    'session_completed',
    'mentor_review_received',
    'message_received',
    'workshop_update',
    'announcement'
  ];
  v_entity_uuid uuid := NULL;
  v_event_key   text;
  v_new_id      uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_user_id = v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'cannot send notification to yourself';
  END IF;

  IF NOT (p_type = ANY(v_allowed_types)) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'notification type not permitted: %', p_type;
  END IF;

  IF p_entity_id IS NOT NULL AND p_entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_entity_uuid := p_entity_id::uuid;
  END IF;

  v_event_key := COALESCE(
    NULLIF(trim(p_event_key), ''),
    p_type || ':' || COALESCE(v_entity_uuid::text, gen_random_uuid()::text)
  );

  INSERT INTO public.notifications (user_id, notification_type, title, message, related_entity_id, event_key, read)
  VALUES (p_user_id, p_type, p_title, p_message, v_entity_uuid, v_event_key, false)
  ON CONFLICT (user_id, event_key) DO NOTHING
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated;

-- Trigger: Notify message recipient on new direct message
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_learner_id  uuid;
  v_mentor_id   uuid;
  v_recipient   uuid;
  v_sender_name text;
  v_preview     text;
BEGIN
  SELECT learner_id, mentor_id
    INTO v_learner_id, v_mentor_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_learner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = v_learner_id THEN
    v_recipient := v_mentor_id;
  ELSIF NEW.sender_id = v_mentor_id THEN
    v_recipient := v_learner_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(full_name), ''), split_part(email, '@', 1), 'Someone')
    INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  v_preview := left(regexp_replace(COALESCE(NEW.content, ''), '\s+', ' ', 'g'), 100);
  IF length(COALESCE(NEW.content, '')) > 100 THEN
    v_preview := v_preview || '...';
  END IF;

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
    v_recipient,
    'message_received',
    'New message from ' || COALESCE(v_sender_name, 'User'),
    v_preview,
    NEW.conversation_id,
    'msg:' || NEW.id::text,
    false
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();

-- Trigger: Notify mentor/learner on mentorship session request & status changes
CREATE OR REPLACE FUNCTION public.notify_on_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_learner_name text;
  v_mentor_name  text;
BEGIN
  SELECT COALESCE(NULLIF(trim(full_name), ''), split_part(email, '@', 1), 'A learner')
    INTO v_learner_name
  FROM public.profiles
  WHERE id = NEW.learner_id;

  SELECT COALESCE(NULLIF(trim(full_name), ''), split_part(email, '@', 1), 'Your mentor')
    INTO v_mentor_name
  FROM public.profiles
  WHERE id = NEW.mentor_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (
      user_id, notification_type, title, message, related_entity_id, event_key, read
    )
    VALUES (
      NEW.mentor_id,
      'mentorship_request',
      'New Mentorship Request',
      COALESCE(v_learner_name, 'A learner') || ' requested a session: "' || NEW.title || '".',
      NEW.id,
      'session_req:' || NEW.id::text,
      false
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_entity_id, event_key, read
      )
      VALUES (
        NEW.learner_id,
        'session_accepted',
        'Mentorship Request Accepted',
        COALESCE(v_mentor_name, 'Your mentor') || ' accepted your mentorship request "' || NEW.title || '".',
        NEW.id,
        'session_acc:' || NEW.id::text,
        false
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;
    ELSIF NEW.status = 'declined' THEN
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_entity_id, event_key, read
      )
      VALUES (
        NEW.learner_id,
        'session_declined',
        'Mentorship Request Declined',
        COALESCE(v_mentor_name, 'Your mentor') || ' declined your mentorship request "' || NEW.title || '".',
        NEW.id,
        'session_dec:' || NEW.id::text,
        false
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_entity_id, event_key, read
      )
      VALUES (
        NEW.mentor_id,
        'session_cancelled',
        'Mentorship Request Cancelled',
        COALESCE(v_learner_name, 'A learner') || ' cancelled the mentorship request "' || NEW.title || '".',
        NEW.id,
        'session_can:' || NEW.id::text,
        false
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (
        user_id, notification_type, title, message, related_entity_id, event_key, read
      )
      VALUES (
        NEW.learner_id,
        'session_completed',
        'Mentorship Session Completed',
        'Your session "' || NEW.title || '" with ' || COALESCE(v_mentor_name, 'your mentor') || ' was marked completed.',
        NEW.id,
        'session_comp:' || NEW.id::text,
        false
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_session_change ON public.sessions;
CREATE TRIGGER trg_notify_on_session_change
AFTER INSERT OR UPDATE OF status ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_session_change();

-- Ensure notifications and roadmap_progress are in supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'roadmap_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_progress;
  END IF;
END;
$$;
