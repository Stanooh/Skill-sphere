'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { checkMentorAccess } from '@/services/mentorVerificationService';
import { getRawAuthUser } from '@/services/authService';
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

    let active = true;

    const resolveAccess = async () => {
      // 1. Mandatory Email verification check
      if (!user) {
        const rawUser = await getRawAuthUser();
        if (!active) return;
        if (rawUser && !rawUser.emailConfirmedAt) {
          router.replace(`/verify-email?email=${encodeURIComponent(rawUser.email)}`);
          setState({ phase: 'redirect' });
          return;
        }

        router.replace('/login');
        setState({ phase: 'redirect' });
        return;
      }

      // 2. Check mentor application lifecycle access
      const result = await checkMentorAccess();
      if (!active) return;

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
    };

    void resolveAccess();
    return () => {
      active = false;
    };
  }, [user, loading, router, allowPending, excludeApproved]);

  if (!user || state.phase === 'loading' || state.phase === 'redirect') {
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
