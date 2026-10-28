-- Ensure authenticated users can insert their own profile on registration
-- But they can only insert with role='learner' (enforced by RLS policy check)
-- The existing policies only allow SELECT and UPDATE for own profile,
-- so we need an INSERT policy and grant

GRANT INSERT ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id AND role = 'learner');
