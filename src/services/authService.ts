/**
 * authService.ts
 *
 * Authentication backed strictly by Supabase Auth.
 * Includes email confirmation verification, rate limiting, and password enforcement.
 */

import type { User, UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { uploadUserAvatar } from './avatarService';
import { getEmailCallbackUrl } from '@/utils/authUrl';
import {
  getLearnerProfile,
  getMentorProfile,
  getDb,
  saveDb,
} from './dataService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export interface SupabaseAuthResult {
  user: User | null;
  needsEmailVerification?: boolean;
  email?: string;
  error?: string;
}

/**
 * Dynamically resolves the email callback redirect URL.
 * Automatically adapts between localhost (development) and Vercel production domain.
 */
function getEmailRedirectUrl(): string {
  return getEmailCallbackUrl('/auth/callback');
}

async function getProfileBackedUser(
  supabase: ReturnType<typeof createClient>,
  authUser: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>
): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error || !profile) return null;

  const role = profile.role as UserRole;
  if (role !== 'learner' && role !== 'mentor' && role !== 'admin') return null;

  return {
    id: authUser.id,
    role,
    name: typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name
      ? authUser.user_metadata.name
      : (authUser.email || 'User'),
    email: authUser.email || '',
    avatar: typeof authUser.user_metadata?.avatar_url === 'string'
      ? authUser.user_metadata.avatar_url
      : undefined,
    createdAt: authUser.created_at,
    emailConfirmedAt: authUser.email_confirmed_at ?? null,
  };
}

/**
 * Ensure a local profile row exists for an authenticated user.
 */
function ensureLocalProfile(user: User): void {
  if (typeof window === 'undefined') return;
  const db = getDb();

  const existing = db.users.find((u) => u.id === user.id);
  if (!existing) {
    db.users.push(user);
    saveDb();
  } else {
    existing.name = user.name;
    existing.role = user.role;
    existing.avatar = user.avatar;
    saveDb();
  }

  if (user.role === 'learner') {
    if (!getLearnerProfile(user.id)) {
      db.learnerProfiles.push({
        id: `lp-${user.id}`,
        userId: user.id,
        bio: '',
        location: '',
        education: '',
        learningGoal: '',
        targetTimeframe: '',
        availableHoursPerWeek: 0,
        skillIds: [],
        skillLevels: {},
        profileComplete: false,
        employerVisibility: false,
      });
      saveDb();
    }
  } else if (user.role === 'mentor') {
    if (!getMentorProfile(user.id)) {
      db.mentorProfiles.push({
        id: `mp-${user.id}`,
        userId: user.id,
        professionalTitle: '',
        bio: '',
        location: '',
        experienceYears: 0,
        education: '',
        certifications: [],
        availability: 'available',
        mentorshipAreas: [],
        skillIds: [],
        rating: 0,
        reviewCount: 0,
        profileComplete: false,
        activated: false,
      });
      saveDb();
    }
  }
}

// ─── Public Authentication Functions ──────────────────────────────────────────

/**
 * Sign in with email + password via Supabase Auth.
 * Checks whether email confirmation is required and enforced.
 */
export async function login(email: string, password: string): Promise<SupabaseAuthResult> {
  const supabase = createClient();
  const trimmedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    // Check if the error indicates unconfirmed email
    if (
      error.message.toLowerCase().includes('email not confirmed') ||
      error.message.toLowerCase().includes('unconfirmed')
    ) {
      return {
        user: null,
        needsEmailVerification: true,
        email: trimmedEmail,
        error: 'Please verify your email address before logging in.',
      };
    }
    return { user: null, error: 'Invalid email or password.' };
  }

  if (!data.user) {
    return { user: null, error: 'Authentication failed. Please try again.' };
  }

  // Check confirmed email
  if (!data.user.email_confirmed_at) {
    // If Supabase allows sign in without confirmation, enforce it strictly here
    return {
      user: null,
      needsEmailVerification: true,
      email: trimmedEmail,
      error: 'Please verify your email address before logging in.',
    };
  }

  const user = await getProfileBackedUser(supabase, data.user);
  if (!user) {
    await supabase.auth.signOut();
    return { user: null, error: 'Your account profile is unavailable. Please contact support.' };
  }
  ensureLocalProfile(user);
  return { user };
}

/**
 * Register a new account via Supabase Auth.
 * Role is allowlisted: only 'learner' and 'mentor' are accepted.
 * Optional profile picture file is processed: if an active session is returned,
 * it is uploaded immediately; otherwise, avatar_url is omitted until verified.
 */
export async function register(
  name: string,
  email: string,
  role: UserRole,
  password: string,
  avatarFile?: File | null
): Promise<SupabaseAuthResult> {
  const safeRole: Exclude<UserRole, 'admin'> = role === 'mentor' ? 'mentor' : 'learner';
  const supabase = createClient();
  const trimmedEmail = email.trim().toLowerCase();

  const emailRedirectTo = getEmailRedirectUrl();

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        name: name.trim(),
        role: safeRole,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('user already exists')) {
      return {
        user: null,
        error: 'An account with this email already exists. Please sign in or reset your password.',
      };
    }
    return { user: null, error: error.message || 'This registration could not be completed. Please check your details and try again.' };
  }

  if (!data.user) {
    return { user: null, error: 'This registration could not be completed. Please check your details and try again.' };
  }

  // If user has a session and avatar file was supplied, upload it now
  if (data.session && avatarFile) {
    try {
      await uploadUserAvatar(data.user.id, avatarFile);
    } catch {
      // Non-fatal, profile created without avatar
    }
  }

  // Check email confirmation status
  const isConfirmed = !!data.user.email_confirmed_at;
  const pendingUser: User = {
    id: data.user.id,
    role: safeRole,
    name: typeof data.user.user_metadata?.name === 'string' && data.user.user_metadata.name
      ? data.user.user_metadata.name
      : trimmedEmail,
    email: data.user.email || trimmedEmail,
    avatar: typeof data.user.user_metadata?.avatar_url === 'string'
      ? data.user.user_metadata.avatar_url
      : undefined,
    createdAt: data.user.created_at,
    emailConfirmedAt: data.user.email_confirmed_at ?? null,
  };

  // Email-confirmation signups have no authenticated session, so profile RLS
  // correctly prevents this client from reading public.profiles yet.
  if (!isConfirmed || !data.session) {
    return {
      user: pendingUser,
      needsEmailVerification: true,
      email: trimmedEmail,
    };
  }

  const user = await getProfileBackedUser(supabase, data.user);
  if (!user) {
    return { user: null, error: 'Your account profile is unavailable. Please contact support.' };
  }

  ensureLocalProfile(user);
  return { user, needsEmailVerification: false };
}

/**
 * Resend email confirmation link.
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const trimmedEmail = email.trim().toLowerCase();

  const emailRedirectTo = getEmailRedirectUrl();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: trimmedEmail,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to resend verification email.' };
  }

  return { success: true };
}

/**
 * Sign out the current user via Supabase Auth.
 */
export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Get the currently authenticated domain User from the active Supabase session.
 * Returns null when not signed in or email unconfirmed.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  // Strict check: unconfirmed email users cannot access as active users
  if (!data.user.email_confirmed_at) {
    return null;
  }

  const user = await getProfileBackedUser(supabase, data.user);
  if (!user) return null;
  ensureLocalProfile(user);
  return user;
}

/**
 * Get the current session user info even if unconfirmed (for verification UI).
 */
export async function getRawAuthUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return getProfileBackedUser(supabase, data.user);
}

/**
 * Get the current authenticated user's ID without fetching the full profile.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
