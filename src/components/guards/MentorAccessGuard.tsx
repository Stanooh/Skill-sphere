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
  allowPending?: boolean;
  excludeApproved?: boolean;
}

type GuardState =
  | { phase: 'loading' }
  | { phase: 'redirect' }
  | { phase: 'denied'; status: MentorApplicationStatus; application: MentorApplication | null }
  | { phase: 'allowed' };

export function MentorAccessGuard({ children, allowPending = false, excludeApproved = false }: MentorAccessGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<GuardState>({ phase: 'loading' });

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      setState({ phase: 'redirect' });
      return;
    }

    (async () => {
      const result = await checkMentorAccess();
      if (result.hasAccess) {
        if (excludeApproved) {
          router.replace('/mentor');
          setState({ phase: 'redirect' });
        } else {
          setState({ phase: 'allowed' });
        }
      } else if (allowPending) {
        if (result.status === 'not_applied' || result.status === 'verification_failed') {
          setState({ phase: 'allowed' });
        } else {
          setState({ phase: 'denied', status: result.status, application: result.application });
        }
      } else if (result.status === 'not_applied') {
        router.replace('/mentor/apply');
        setState({ phase: 'redirect' });
      } else {
        setState({ phase: 'denied', status: result.status, application: result.application });
      }
    })();
  }, [user, loading, router, allowPending, excludeApproved]);

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
