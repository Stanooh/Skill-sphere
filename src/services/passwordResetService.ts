import { createClient } from '@/lib/supabase/client';

export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { success: false };
  }

  return { success: true };
}

export async function establishRecoverySession(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const recoveryHash = new URLSearchParams(url.hash.slice(1)).get('type') === 'recovery';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { success: false, error: 'This password reset link is invalid or has expired.' };
    }

    url.searchParams.delete('code');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session || (!code && !recoveryHash)) {
    return { success: false, error: 'This password reset link is invalid or has expired.' };
  }

  return { success: true };
}

export async function updatePassword(password: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Your password reset session is no longer valid.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { success: false, error: 'We could not update your password. Please request a new reset link.' };
  }

  await supabase.auth.signOut();
  return { success: true };
}
