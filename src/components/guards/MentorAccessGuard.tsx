'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { checkMentorAccess } from '@/services/mentorVerificationService';
import type { MentorApplicationStatus, MentorApplication } from '@/types';
import { MentorStatusScreen } from '@/views/mentor/MentorStatusScreen';

interface MentorAccessGuardProps {
  children: ReactNode;
  title?: string;
}

type GuardState =
  | { phase: 'loading' }
  | { phase: 'redirect' }
  | { phase: 'denied'; status: MentorApplicationStatus; application: MentorApplication | null }
  | { phase: 'allowed' };

export function MentorAccessGuard({ children }: MentorAccessGuardProps) {
  const { user, loading, isSupabaseAuth } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<GuardState>({ phase: 'loading' });

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      setState({ phase: 'redirect' });
      return;
    }

    // If using demo (localStorage) auth, fall back to the existing role check
    // Demo mentors are pre-seeded and trusted for prototype purposes
    if (!isSupabaseAuth) {
      if (user.role === 'mentor') {
        setState({ phase: 'allowed' });
      } else if (user.role === 'admin') {
        router.replace('/admin');
        setState({ phase: 'redirect' });
      } else {
        router.replace('/learner/apply');
        setState({ phase: 'redirect' });
      }
      return;
    }

    // Supabase auth: check the trusted database record
    (async () => {
      const result = await checkMentorAccess();
      if (result.hasAccess) {
        setState({ phase: 'allowed' });
      } else if (result.status === 'not_applied') {
        router.replace('/learner/apply');
        setState({ phase: 'redirect' });
      } else {
        setState({ phase: 'denied', status: result.status, application: result.application });
      }
    })();
  }, [user, loading, isSupabaseAuth, router]);

  if (state.phase === 'loading' || state.phase === 'redirect') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state.phase === 'denied') {
    return (
      <MentorStatusScreen status={state.status} application={state.application} />
    );
  }

  return <>{children}</>;
}
