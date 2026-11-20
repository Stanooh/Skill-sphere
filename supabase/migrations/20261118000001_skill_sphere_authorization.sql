CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_role text;
BEGIN
  selected_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'learner');
  IF selected_role NOT IN ('learner', 'mentor') THEN
    selected_role := 'learner';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    NEW.email,
    selected_role
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      email = EXCLUDED.email,
      updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role
    AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change a profile role';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_non_admin_role_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_non_admin_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_non_admin_profile_role_change
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_role_change();

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (except role cannot be changed via client update)" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert a non-admin profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile without changing role" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert a non-admin profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role IN ('learner', 'mentor'));

CREATE POLICY "Users can update their own profile without changing role"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (
  public.is_admin()
  OR (
    auth.uid() = id
    AND role = (
      SELECT current_profile.role
      FROM public.profiles AS current_profile
      WHERE current_profile.id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Applicants and admins can view mentor applications" ON public.mentor_applications;
DROP POLICY IF EXISTS "Users can create their own mentor application" ON public.mentor_applications;
DROP POLICY IF EXISTS "Applicants and admins can update mentor applications" ON public.mentor_applications;

CREATE POLICY "Applicants and admins can view mentor applications"
ON public.mentor_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own mentor application"
ON public.mentor_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'not_applied'
  AND identity_verified = false
  AND competency_verified = false
  AND admin_approved = false
);

CREATE POLICY "Applicants and admins can update mentor applications"
ON public.mentor_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Applicants and admins can view application skills" ON public.mentor_application_skills;
DROP POLICY IF EXISTS "Applicants can create application skills" ON public.mentor_application_skills;
DROP POLICY IF EXISTS "Applicants and admins can update application skills" ON public.mentor_application_skills;

CREATE POLICY "Applicants and admins can view application skills"
ON public.mentor_application_skills
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications AS application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

CREATE POLICY "Applicants can create application skills"
ON public.mentor_application_skills
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND feedback IS NULL
  AND reviewed_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.mentor_applications AS application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

CREATE POLICY "Applicants and admins can update application skills"
ON public.mentor_application_skills
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications AS application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications AS application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Applicants and admins can view verification history" ON public.mentor_verification_history;

CREATE POLICY "Applicants and admins can view verification history"
ON public.mentor_verification_history
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.mentor_applications AS application
    WHERE application.id = application_id
      AND application.user_id = auth.uid()
  )
);

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.mentor_applications FROM anon;
REVOKE ALL ON TABLE public.mentor_application_skills FROM anon;
REVOKE ALL ON TABLE public.mentor_verification_history FROM anon;

REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.mentor_applications FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.mentor_applications TO authenticated;

REVOKE ALL ON TABLE public.mentor_application_skills FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.mentor_application_skills TO authenticated;

REVOKE ALL ON TABLE public.mentor_verification_history FROM authenticated;
GRANT SELECT ON TABLE public.mentor_verification_history TO authenticated;
