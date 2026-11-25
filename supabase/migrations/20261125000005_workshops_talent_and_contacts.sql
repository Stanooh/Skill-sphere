-- Migration: Enforce mentor-recommendation-only Find Talents visibility via RLS,
-- extend employer_contact_requests for roles/reasons/replies/conversations,
-- and add automatic notification triggers for contact requests and replies.

-- 1. Helper: true only if student has an accepted, non-hidden recommendation from an approved mentor
CREATE OR REPLACE FUNCTION public.has_approved_mentor_recommendation(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_recommendations sr
    WHERE sr.student_id = p_student_id
      AND sr.student_approval_status = 'accepted'
      AND sr.admin_action <> 'hidden'
      AND public.is_approved_mentor(sr.mentor_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_approved_mentor_recommendation(uuid) TO anon, authenticated;

-- 2. Enforce recommendation-based visibility on learner_profiles & student_recommendations
DROP POLICY IF EXISTS "Public can view talent profiles" ON public.learner_profiles;
CREATE POLICY "Public can view talent profiles"
ON public.learner_profiles
FOR SELECT
USING (
  employer_visibility = true
  AND profile_complete = true
  AND public.has_approved_mentor_recommendation(user_id)
);

DROP POLICY IF EXISTS "Public can view accepted student recommendations" ON public.student_recommendations;
CREATE POLICY "Public can view accepted student recommendations"
ON public.student_recommendations
FOR SELECT
USING (
  student_approval_status = 'accepted'
  AND admin_action <> 'hidden'
  AND public.is_approved_mentor(mentor_id)
);

-- 3. Extend employer_contact_requests for role, reason, sender_user_id, conversation_id, reply
ALTER TABLE public.employer_contact_requests
  ADD COLUMN IF NOT EXISTS employer_role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS learner_reply text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_employer_contact_requests_learner
  ON public.employer_contact_requests (learner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employer_contact_requests_sender
  ON public.employer_contact_requests (sender_user_id)
  WHERE sender_user_id IS NOT NULL;

-- Update status check constraint if one exists, or ensure valid statuses
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.employer_contact_requests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.employer_contact_requests DROP CONSTRAINT %I', v_conname);
  END IF;

  ALTER TABLE public.employer_contact_requests
    ADD CONSTRAINT employer_contact_requests_status_check
    CHECK (status IN ('pending', 'responded', 'closed', 'accepted', 'declined'));
END;
$$;

-- Tighten RLS on employer_contact_requests
DROP POLICY IF EXISTS "Public can create employer contact requests" ON public.employer_contact_requests;
CREATE POLICY "Public can create employer contact requests"
ON public.employer_contact_requests
FOR INSERT
WITH CHECK (
  public.has_approved_mentor_recommendation(learner_id)
  AND (sender_user_id IS NULL OR sender_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Learners and admins can view contact requests" ON public.employer_contact_requests;
CREATE POLICY "Learners, senders, and admins can view contact requests"
ON public.employer_contact_requests
FOR SELECT
USING (
  auth.uid() = learner_id
  OR auth.uid() = sender_user_id
  OR public.is_admin()
);

-- Allow creating conversations between a learner and an authenticated contact-request sender
DROP POLICY IF EXISTS "Participants can create conversations" ON public.conversations;
CREATE POLICY "Participants can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  (
    learner_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.user_id = conversations.mentor_id AND mp.activated = true
      )
      OR EXISTS (
        SELECT 1 FROM public.employer_contact_requests ecr
        WHERE ecr.learner_id = auth.uid() AND ecr.sender_user_id = conversations.mentor_id
      )
    )
  )
  OR (
    mentor_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.user_id = auth.uid() AND mp.activated = true
      )
      OR EXISTS (
        SELECT 1 FROM public.employer_contact_requests ecr
        WHERE ecr.learner_id = conversations.learner_id AND ecr.sender_user_id = auth.uid()
      )
    )
  )
  OR public.is_admin()
);

-- 4. Triggers for contact request & learner reply notifications
CREATE OR REPLACE FUNCTION public.notify_on_contact_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reason text;
BEGIN
  v_reason := COALESCE(NULLIF(trim(NEW.reason), ''), 'a potential opportunity');

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
    NEW.learner_id,
    'employer_contact',
    'New Professional Opportunity',
    NEW.employer_name || ' from ' || NEW.company_name || ' has reached out to you regarding ' || v_reason || '.',
    NEW.id,
    'contact_req:' || NEW.id::text,
    false
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_contact_request ON public.employer_contact_requests;
CREATE TRIGGER trg_notify_on_contact_request
AFTER INSERT ON public.employer_contact_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_contact_request();

CREATE OR REPLACE FUNCTION public.notify_on_contact_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_learner_name text;
BEGIN
  IF NEW.sender_user_id IS NOT NULL
     AND NEW.learner_reply IS NOT NULL
     AND trim(NEW.learner_reply) <> ''
     AND NEW.learner_reply IS DISTINCT FROM OLD.learner_reply THEN
    SELECT COALESCE(NULLIF(trim(full_name), ''), split_part(email, '@', 1), 'A learner')
      INTO v_learner_name
    FROM public.profiles
    WHERE id = NEW.learner_id;

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
      NEW.sender_user_id,
      'contact_reply',
      'New Reply to Your Opportunity',
      COALESCE(v_learner_name, 'A learner') || ' responded to your inquiry from ' || NEW.company_name || '.',
      NEW.id,
      'contact_reply:' || NEW.id::text || ':' || md5(NEW.learner_reply),
      false
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_contact_reply ON public.employer_contact_requests;
CREATE TRIGGER trg_notify_on_contact_reply
AFTER UPDATE OF learner_reply ON public.employer_contact_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_contact_reply();
