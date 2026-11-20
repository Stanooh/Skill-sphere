'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getRawAuthUser } from '@/services/authService';
import type { UserRole } from '@/types';

function roleBase(role: UserRole): string {
  return role === 'learner' ? '/learner' : role === 'mentor' ? '/mentor/apply' : '/admin';
}

export function ProtectedRoute({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    if (loading) return;

    let isMounted = true;

    async function checkUserVerification() {
      if (!user) {
        // Double-check if the user is signed in with Supabase but unverified
        const rawUser = await getRawAuthUser();
        if (!isMounted) return;

        if (rawUser && !rawUser.emailConfirmedAt) {
          // Unverified email: block access and send to verify-email
          router.replace(`/verify-email?email=${encodeURIComponent(rawUser.email)}`);
          return;
        }

        router.replace('/login');
        return;
      }

      // Check role
      if (user.role !== role) {
        router.replace(roleBase(user.role));
        return;
      }

      setCheckingVerification(false);
    }

    checkUserVerification();

    return () => {
      isMounted = false;
    };
  }, [user, loading, role, router]);

  if (loading || checkingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== role) return null;

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(roleBase(user.role));
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return <>{children}</>;
}
