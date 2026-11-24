-- Migration: Add SECURITY DEFINER function for cross-user notification inserts
-- Authenticated users (learners, mentors) cannot INSERT into notifications for OTHER users
-- because the INSERT RLS policy is admin-only.
-- This SECURITY DEFINER function bypasses RLS safely for specific, controlled notification types.
-- It validates the caller is authenticated and limits which types are insertable by non-admins.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id    uuid,
  p_type       text,
  p_title      text,
  p_message    text,
  p_entity_id  text DEFAULT NULL
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
    'mentor_review_received',
    'message_received'
  ];
  v_new_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Callers can only send notifications to OTHER users (not themselves)
  IF p_user_id = v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'cannot send notification to yourself';
  END IF;

  IF NOT (p_type = ANY(v_allowed_types)) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'notification type not permitted: %', p_type;
  END IF;

  INSERT INTO public.notifications (user_id, notification_type, title, message, related_entity_id, read)
  VALUES (p_user_id, p_type, p_title, p_message, p_entity_id, false)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) TO authenticated;
