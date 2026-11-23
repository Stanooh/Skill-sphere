-- =====================================================================
-- Migration: Mentor Rating & Review System
-- =====================================================================

-- 1. Create the mentor_reviews table
CREATE TABLE IF NOT EXISTS public.mentor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  workshop_id uuid REFERENCES public.workshops(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_self_rating CHECK (mentor_id != learner_id),
  CONSTRAINT uq_mentor_learner_review UNIQUE (mentor_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_reviews_mentor ON public.mentor_reviews(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_reviews_learner ON public.mentor_reviews(learner_id);
CREATE INDEX IF NOT EXISTS idx_mentor_reviews_rating ON public.mentor_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_mentor_reviews_created ON public.mentor_reviews(created_at DESC);

-- 2. Eligibility function: learner can rate only if they have interacted with the mentor
CREATE OR REPLACE FUNCTION public.can_learner_rate_mentor(p_learner_id uuid, p_mentor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cannot rate oneself
  IF p_learner_id = p_mentor_id THEN
    RETURN false;
  END IF;

  -- Mentor must be an approved, activated mentor
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_profiles mp
    WHERE mp.user_id = p_mentor_id AND mp.activated = true
  ) THEN
    RETURN false;
  END IF;

  -- Learner must have had an accepted or completed session with the mentor
  IF EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.mentor_id = p_mentor_id
      AND s.learner_id = p_learner_id
      AND s.status IN ('accepted', 'completed')
  ) THEN
    RETURN true;
  END IF;

  -- OR learner must be registered for a workshop led by this mentor
  IF EXISTS (
    SELECT 1 FROM public.workshops w
    JOIN public.workshop_registrations wr ON wr.workshop_id = w.id
    WHERE w.mentor_id = p_mentor_id
      AND wr.learner_id = p_learner_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_learner_rate_mentor(uuid, uuid) TO anon, authenticated;

-- 3. Automatic recalculation trigger function for mentor_profiles rating and review_count
CREATE OR REPLACE FUNCTION public.recalculate_mentor_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentor_id uuid;
  v_avg_rating numeric(3,1);
  v_review_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_mentor_id := OLD.mentor_id;
  ELSE
    v_mentor_id := NEW.mentor_id;
  END IF;

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0),
    COUNT(*)
  INTO
    v_avg_rating,
    v_review_count
  FROM public.mentor_reviews
  WHERE mentor_id = v_mentor_id;

  UPDATE public.mentor_profiles
  SET
    rating = v_avg_rating,
    review_count = v_review_count,
    updated_at = timezone('utc'::text, now())
  WHERE user_id = v_mentor_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_mentor_rating ON public.mentor_reviews;
CREATE TRIGGER trg_recalculate_mentor_rating
AFTER INSERT OR UPDATE OR DELETE ON public.mentor_reviews
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_mentor_rating();

-- 4. Rating summary calculation RPC
CREATE OR REPLACE FUNCTION public.get_mentor_rating_summary(p_mentor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'mentorId', p_mentor_id,
    'averageRating', COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0),
    'totalReviews', COUNT(*),
    'distribution', jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    )
  )
  INTO v_summary
  FROM public.mentor_reviews
  WHERE mentor_id = p_mentor_id;

  RETURN v_summary;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mentor_rating_summary(uuid) TO anon, authenticated;

-- 5. Row Level Security policies
ALTER TABLE public.mentor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reviews of approved mentors" ON public.mentor_reviews;
CREATE POLICY "Public can view reviews of approved mentors"
  ON public.mentor_reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_profiles mp
      WHERE mp.user_id = mentor_id AND mp.activated = true
    )
  );

DROP POLICY IF EXISTS "Eligible learners can create reviews" ON public.mentor_reviews;
CREATE POLICY "Eligible learners can create reviews"
  ON public.mentor_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = learner_id
    AND public.can_learner_rate_mentor(auth.uid(), mentor_id)
  );

DROP POLICY IF EXISTS "Learners can update own reviews" ON public.mentor_reviews;
CREATE POLICY "Learners can update own reviews"
  ON public.mentor_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = learner_id)
  WITH CHECK (
    auth.uid() = learner_id
    AND public.can_learner_rate_mentor(auth.uid(), mentor_id)
  );

DROP POLICY IF EXISTS "Learners and admins can delete reviews" ON public.mentor_reviews;
CREATE POLICY "Learners and admins can delete reviews"
  ON public.mentor_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = learner_id OR public.is_admin());

-- 6. Clean up any fabricated legacy ratings on mentor_profiles
UPDATE public.mentor_profiles mp
SET
  rating = COALESCE((
    SELECT ROUND(AVG(mr.rating)::numeric, 1)
    FROM public.mentor_reviews mr
    WHERE mr.mentor_id = mp.user_id
  ), 0.0),
  review_count = COALESCE((
    SELECT COUNT(*)
    FROM public.mentor_reviews mr
    WHERE mr.mentor_id = mp.user_id
  ), 0);
