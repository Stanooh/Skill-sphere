-- Migration: 20261124000000_complete_backend_tables.sql
-- Description: Adds persistent tables for workshops, workshop registrations, sessions,
-- saved mentors, student recommendations, employer contact requests, admin action logs,
-- and establishes comprehensive RLS policies and grants.

-- 1. Helper function: check if a user is an approved mentor
CREATE OR REPLACE FUNCTION public.is_approved_mentor(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_profiles
    WHERE public.mentor_profiles.user_id = check_user_id
      AND public.mentor_profiles.activated = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_mentor(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_mentor(uuid) TO authenticated, anon;

-- 2. Workshops Table
CREATE TABLE IF NOT EXISTS public.workshops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id text REFERENCES public.skills(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    start_time text,
    end_time text,
    duration_minutes integer NOT NULL DEFAULT 60,
    capacity integer NOT NULL DEFAULT 10 CHECK (capacity >= 1),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
    cover_image text,
    format text DEFAULT 'virtual',
    meeting_link text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_workshops_mentor_id ON public.workshops(mentor_id);
CREATE INDEX IF NOT EXISTS idx_workshops_status ON public.workshops(status);
CREATE INDEX IF NOT EXISTS idx_workshops_date ON public.workshops(date);

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published or completed workshops" ON public.workshops;
CREATE POLICY "Public can view published or completed workshops"
    ON public.workshops
    FOR SELECT
    TO anon, authenticated
    USING (status IN ('published', 'completed'));

DROP POLICY IF EXISTS "Mentors can view their own workshops" ON public.workshops;
CREATE POLICY "Mentors can view their own workshops"
    ON public.workshops
    FOR SELECT
    TO authenticated
    USING (auth.uid() = mentor_id OR public.is_admin());

DROP POLICY IF EXISTS "Approved mentors can create workshops" ON public.workshops;
CREATE POLICY "Approved mentors can create workshops"
    ON public.workshops
    FOR INSERT
    TO authenticated
    WITH CHECK ((auth.uid() = mentor_id AND public.is_approved_mentor(auth.uid())) OR public.is_admin());

DROP POLICY IF EXISTS "Mentors can update their own workshops" ON public.workshops;
CREATE POLICY "Mentors can update their own workshops"
    ON public.workshops
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = mentor_id OR public.is_admin())
    WITH CHECK (auth.uid() = mentor_id OR public.is_admin());

DROP POLICY IF EXISTS "Mentors can delete their own workshops" ON public.workshops;
CREATE POLICY "Mentors can delete their own workshops"
    ON public.workshops
    FOR DELETE
    TO authenticated
    USING (auth.uid() = mentor_id OR public.is_admin());

-- 3. Workshop Registrations Table
CREATE TABLE IF NOT EXISTS public.workshop_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workshop_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_workshop_reg_workshop ON public.workshop_registrations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_reg_learner ON public.workshop_registrations(learner_id);

ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners and workshop mentors can view registrations" ON public.workshop_registrations;
CREATE POLICY "Learners and workshop mentors can view registrations"
    ON public.workshop_registrations
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = learner_id
        OR EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.mentor_id = auth.uid())
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Learners can register for published workshops" ON public.workshop_registrations;
CREATE POLICY "Learners can register for published workshops"
    ON public.workshop_registrations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = learner_id
        AND EXISTS (
            SELECT 1 FROM public.workshops w
            WHERE w.id = workshop_id
              AND w.status = 'published'
        )
    );

DROP POLICY IF EXISTS "Learners can cancel their registrations" ON public.workshop_registrations;
CREATE POLICY "Learners can cancel their registrations"
    ON public.workshop_registrations
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = learner_id
        OR EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.mentor_id = auth.uid())
        OR public.is_admin()
    );

-- 4. Mentorship Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'Mentorship Session',
    description text NOT NULL DEFAULT '',
    scheduled_date timestamptz NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 45 CHECK (duration_minutes >= 15),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sessions_learner ON public.sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor ON public.sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session participants can view sessions" ON public.sessions;
CREATE POLICY "Session participants can view sessions"
    ON public.sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = learner_id OR auth.uid() = mentor_id OR public.is_admin());

DROP POLICY IF EXISTS "Learners can request sessions with approved mentors" ON public.sessions;
CREATE POLICY "Learners can request sessions with approved mentors"
    ON public.sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = learner_id
        AND public.is_approved_mentor(mentor_id)
    );

DROP POLICY IF EXISTS "Session participants can update session status" ON public.sessions;
CREATE POLICY "Session participants can update session status"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = learner_id OR auth.uid() = mentor_id OR public.is_admin())
    WITH CHECK (auth.uid() = learner_id OR auth.uid() = mentor_id OR public.is_admin());

-- 5. Saved Mentors Table
CREATE TABLE IF NOT EXISTS public.saved_mentors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(learner_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_mentors_learner ON public.saved_mentors(learner_id);

ALTER TABLE public.saved_mentors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view their own saved mentors" ON public.saved_mentors;
CREATE POLICY "Learners can view their own saved mentors"
    ON public.saved_mentors
    FOR SELECT
    TO authenticated
    USING (auth.uid() = learner_id);

DROP POLICY IF EXISTS "Learners can save mentors" ON public.saved_mentors;
CREATE POLICY "Learners can save mentors"
    ON public.saved_mentors
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = learner_id);

DROP POLICY IF EXISTS "Learners can unsave mentors" ON public.saved_mentors;
CREATE POLICY "Learners can unsave mentors"
    ON public.saved_mentors
    FOR DELETE
    TO authenticated
    USING (auth.uid() = learner_id);

-- 6. Student Recommendations Table
CREATE TABLE IF NOT EXISTS public.student_recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    strengths text[] NOT NULL DEFAULT '{}',
    technical_skills text[] NOT NULL DEFAULT '{}',
    communication_assessment text NOT NULL DEFAULT '',
    problem_solving_assessment text NOT NULL DEFAULT '',
    achievements text[] NOT NULL DEFAULT '{}',
    career_areas text[] NOT NULL DEFAULT '{}',
    recommendation text NOT NULL,
    student_approval_status text NOT NULL DEFAULT 'pending' CHECK (student_approval_status IN ('pending', 'accepted', 'declined')),
    admin_action text NOT NULL DEFAULT 'none' CHECK (admin_action IN ('none', 'endorsed', 'hidden', 'flagged')),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_student_recs_student ON public.student_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_student_recs_mentor ON public.student_recommendations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_student_recs_status ON public.student_recommendations(student_approval_status);

ALTER TABLE public.student_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view accepted student recommendations" ON public.student_recommendations;
CREATE POLICY "Public can view accepted student recommendations"
    ON public.student_recommendations
    FOR SELECT
    TO anon, authenticated
    USING (student_approval_status = 'accepted' AND admin_action != 'hidden');

DROP POLICY IF EXISTS "Participants and admins can view recommendations" ON public.student_recommendations;
CREATE POLICY "Participants and admins can view recommendations"
    ON public.student_recommendations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id OR auth.uid() = mentor_id OR public.is_admin());

DROP POLICY IF EXISTS "Approved mentors can create student recommendations" ON public.student_recommendations;
CREATE POLICY "Approved mentors can create student recommendations"
    ON public.student_recommendations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = mentor_id AND public.is_approved_mentor(auth.uid()));

DROP POLICY IF EXISTS "Students and admins can update recommendations" ON public.student_recommendations;
CREATE POLICY "Students and admins can update recommendations"
    ON public.student_recommendations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id OR auth.uid() = mentor_id OR public.is_admin())
    WITH CHECK (auth.uid() = student_id OR auth.uid() = mentor_id OR public.is_admin());

-- 7. Employer Contact Requests Table
CREATE TABLE IF NOT EXISTS public.employer_contact_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employer_name text NOT NULL,
    employer_email text NOT NULL,
    company_name text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'read', 'responded', 'archived')),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_employer_contact_learner ON public.employer_contact_requests(learner_id);

ALTER TABLE public.employer_contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create employer contact requests" ON public.employer_contact_requests;
CREATE POLICY "Public can create employer contact requests"
    ON public.employer_contact_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Learners and admins can view contact requests" ON public.employer_contact_requests;
CREATE POLICY "Learners and admins can view contact requests"
    ON public.employer_contact_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = learner_id OR public.is_admin());

DROP POLICY IF EXISTS "Learners and admins can update contact request status" ON public.employer_contact_requests;
CREATE POLICY "Learners and admins can update contact request status"
    ON public.employer_contact_requests
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = learner_id OR public.is_admin())
    WITH CHECK (auth.uid() = learner_id OR public.is_admin());

-- 8. Admin Action Logs Table
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action text NOT NULL,
    target_id text NOT NULL,
    target_type text NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage action logs" ON public.admin_action_logs;
CREATE POLICY "Admins can manage action logs"
    ON public.admin_action_logs
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 9. Expanded RLS on learner_profiles for Find Talent public discoverability & Admin management
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS employer_visibility boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Public can view talent profiles" ON public.learner_profiles;
CREATE POLICY "Public can view talent profiles"
    ON public.learner_profiles
    FOR SELECT
    TO anon, authenticated
    USING (employer_visibility = true AND profile_complete = true);

DROP POLICY IF EXISTS "Admins can view all learner profiles" ON public.learner_profiles;
CREATE POLICY "Admins can view all learner profiles"
    ON public.learner_profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 10. Expanded RLS on profiles for talent & workshop discovery
DROP POLICY IF EXISTS "Public can view discovered talent identities" ON public.profiles;
CREATE POLICY "Public can view discovered talent identities"
    ON public.profiles
    FOR SELECT
    TO anon, authenticated
    USING (
        id IN (SELECT user_id FROM public.learner_profiles WHERE employer_visibility = true AND profile_complete = true)
        OR id IN (SELECT user_id FROM public.mentor_profiles WHERE activated = true)
        OR id IN (SELECT mentor_id FROM public.workshops WHERE status IN ('published', 'completed'))
    );

-- 11. Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshops TO authenticated;
GRANT SELECT ON public.workshops TO anon;

GRANT SELECT, INSERT, DELETE ON public.workshop_registrations TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.saved_mentors TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_recommendations TO authenticated;
GRANT SELECT ON public.student_recommendations TO anon;

GRANT INSERT ON public.employer_contact_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.employer_contact_requests TO authenticated;

GRANT ALL ON public.admin_action_logs TO authenticated;

GRANT SELECT ON public.learner_profiles TO anon, authenticated;
GRANT SELECT (id, full_name, email, role) ON public.profiles TO anon;
