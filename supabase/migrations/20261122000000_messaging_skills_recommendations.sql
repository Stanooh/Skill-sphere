-- Migration: 20261122000000_messaging_skills_recommendations.sql
-- Description: Adds skills directory, real-time learner-mentor conversations & messages, strict RLS policies, and triggers.

-- 1. Skills table (dynamic skills directory)
CREATE TABLE IF NOT EXISTS public.skills (
    id text PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    related_skill_ids text[] DEFAULT '{}'::text[],
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Skills are viewable by everyone" ON public.skills;
CREATE POLICY "Skills are viewable by everyone"
    ON public.skills
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can insert or modify skills" ON public.skills;
CREATE POLICY "Admins can insert or modify skills"
    ON public.skills
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

GRANT SELECT ON public.skills TO anon, authenticated;
GRANT ALL ON public.skills TO service_role;

-- Seed core skills into public.skills
INSERT INTO public.skills (id, name, category, related_skill_ids) VALUES
('skill-react', 'React', 'Frontend', ARRAY['skill-js', 'skill-next', 'skill-ts']),
('skill-js', 'JavaScript', 'Frontend', ARRAY['skill-react', 'skill-ts', 'skill-next']),
('skill-ts', 'TypeScript', 'Frontend', ARRAY['skill-js', 'skill-react', 'skill-next']),
('skill-next', 'Next.js', 'Frontend', ARRAY['skill-react', 'skill-js', 'skill-ts']),
('skill-node', 'Node.js', 'Backend', ARRAY['skill-js', 'skill-express', 'skill-db']),
('skill-express', 'Express', 'Backend', ARRAY['skill-node', 'skill-js']),
('skill-python', 'Python', 'Backend', ARRAY['skill-django', 'skill-flask']),
('skill-django', 'Django', 'Backend', ARRAY['skill-python']),
('skill-flask', 'Flask', 'Backend', ARRAY['skill-python']),
('skill-db', 'Databases', 'Backend', ARRAY['skill-node', 'skill-sql']),
('skill-sql', 'SQL', 'Backend', ARRAY['skill-db', 'skill-postgres']),
('skill-postgres', 'PostgreSQL', 'Backend', ARRAY['skill-sql', 'skill-db']),
('skill-css', 'CSS', 'Frontend', ARRAY['skill-html', 'skill-tailwind']),
('skill-html', 'HTML', 'Frontend', ARRAY['skill-css']),
('skill-tailwind', 'Tailwind CSS', 'Frontend', ARRAY['skill-css', 'skill-react']),
('skill-auth', 'Authentication', 'Backend', ARRAY['skill-node', 'skill-db']),
('skill-deploy', 'Deployment', 'DevOps', ARRAY['skill-node', 'skill-next']),
('skill-docker', 'Docker', 'DevOps', ARRAY['skill-deploy']),
('skill-graphql', 'GraphQL', 'Backend', ARRAY['skill-node', 'skill-react']),
('skill-testing', 'Testing', 'Engineering', ARRAY['skill-react', 'skill-node']),
('skill-ui', 'UI/UX Design', 'Design', ARRAY['skill-css', 'skill-figma']),
('skill-figma', 'Figma', 'Design', ARRAY['skill-ui']),
('skill-mobile', 'React Native', 'Mobile', ARRAY['skill-react', 'skill-js']),
('skill-algo', 'Algorithms', 'Computer Science', ARRAY['skill-python', 'skill-js'])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    related_skill_ids = EXCLUDED.related_skill_ids;

-- 2. Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT conversations_learner_mentor_unique UNIQUE (learner_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS conversations_learner_idx ON public.conversations(learner_id);
CREATE INDEX IF NOT EXISTS conversations_mentor_idx ON public.conversations(mentor_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON public.conversations(last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (learner_id = auth.uid() OR mentor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Participants can create conversations" ON public.conversations;
CREATE POLICY "Participants can create conversations"
    ON public.conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            learner_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.mentor_profiles mp
                WHERE mp.user_id = mentor_id
                AND mp.activated = true
            )
        )
        OR
        (
            mentor_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.mentor_profiles mp
                WHERE mp.user_id = auth.uid()
                AND mp.activated = true
            )
        )
        OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "Participants can update their conversations" ON public.conversations;
CREATE POLICY "Participants can update their conversations"
    ON public.conversations
    FOR UPDATE
    TO authenticated
    USING (learner_id = auth.uid() OR mentor_id = auth.uid() OR public.is_admin())
    WITH CHECK (learner_id = auth.uid() OR mentor_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

-- 3. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 5000),
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND (c.learner_id = auth.uid() OR c.mentor_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND (c.learner_id = auth.uid() OR c.mentor_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Participants can mark messages as read" ON public.messages;
CREATE POLICY "Participants can mark messages as read"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND (c.learner_id = auth.uid() OR c.mentor_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND (c.learner_id = auth.uid() OR c.mentor_id = auth.uid())
        )
    );

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- 4. Profile visibility for conversation partners and active mentors
DROP POLICY IF EXISTS "Conversation partners and active mentors are viewable" ON public.profiles;
CREATE POLICY "Conversation partners and active mentors are viewable"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE (c.learner_id = auth.uid() AND c.mentor_id = profiles.id)
               OR (c.mentor_id = auth.uid() AND c.learner_id = profiles.id)
        )
        OR EXISTS (
            SELECT 1 FROM public.mentor_profiles mp
            WHERE mp.user_id = profiles.id
            AND mp.activated = true
        )
    );

-- 5. Trigger to update last_message_at on conversations
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();

-- 6. RPC to get skills with dynamic counts of eligible mentors
CREATE OR REPLACE FUNCTION public.get_skills_with_mentor_counts()
RETURNS TABLE (
    skill_id text,
    skill_name text,
    category text,
    mentor_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        s.id AS skill_id,
        s.name AS skill_name,
        s.category,
        COUNT(DISTINCT mp.user_id) AS mentor_count
    FROM public.skills s
    LEFT JOIN public.mentor_profiles mp
        ON mp.activated = true
        AND mp.profile_complete = true
        AND mp.availability != 'unavailable'
        AND (mp.skill_ids ? s.id)
    GROUP BY s.id, s.name, s.category
    ORDER BY s.category ASC, s.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_skills_with_mentor_counts() TO anon, authenticated;

-- 7. Enable Realtime on messages and conversations
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
END;
$$;
