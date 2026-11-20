import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/types';
import { createClient } from './server';

const validRoles: UserRole[] = ['learner', 'mentor', 'admin'];

export interface AuthenticatedProfile {
  id: string;
  role: UserRole;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && validRoles.includes(value as UserRole);
}

export async function getAuthenticatedProfile(): Promise<{
  user: User;
  profile: AuthenticatedProfile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email_confirmed_at) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !isUserRole(profile.role)) {
    return null;
  }

  return { user, profile: profile as AuthenticatedProfile };
}
