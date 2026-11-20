CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'learner'
    CHECK (role IN ('learner', 'mentor', 'admin')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.mentor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_applied'
    CHECK (status IN (
      'not_applied',
      'pending_verification',
      'verification_failed',
      'pending_admin_approval',
      'approved',
      'rejected',
      'suspended'
    )),
  professional_headline text NOT NULL DEFAULT '',
  biography text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  linkedin_url text,
  github_url text,
  portfolio_url text,
  identity_verified boolean NOT NULL DEFAULT false,
  competency_verified boolean NOT NULL DEFAULT false,
  admin_approved boolean NOT NULL DEFAULT false,
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.mentor_application_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  skill_name text NOT NULL,
  evidence_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('not-submitted', 'pending', 'verified', 'rejected', 'needs-evidence')),
  feedback text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (application_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.mentor_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_application_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_verification_history ENABLE ROW LEVEL SECURITY;
