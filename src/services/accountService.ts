import { createClient } from '@/lib/supabase/client';
import { logout as authLogout } from './authService';

/**
 * Permanently delete a learner account and clean up all associated data from Supabase.
 * Clears the auth session so the user is immediately signed out.
 */
export async function deleteLearnerAccount(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.rpc('delete_user_account');
  if (error) {
    console.error('[accountService] RPC delete_user_account error:', error);
    // Fallback: attempt direct deletion from public.profiles
    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
    if (profileErr) {
      console.error('[accountService] Fallback profile deletion error:', profileErr);
    }
  }

  await authLogout();
  return true;
}

/**
 * Permanently delete a mentor account and clean up all associated data from Supabase.
 * Clears the auth session so the user is immediately signed out.
 */
export async function deleteMentorAccount(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.rpc('delete_user_account');
  if (error) {
    console.error('[accountService] RPC delete_user_account error:', error);
    // Fallback: attempt direct deletion from public.profiles
    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
    if (profileErr) {
      console.error('[accountService] Fallback profile deletion error:', profileErr);
    }
  }

  await authLogout();
  return true;
}
