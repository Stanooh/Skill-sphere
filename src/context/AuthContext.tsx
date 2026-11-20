'use client';

/**
 * AuthContext.tsx
 *
 * Provides authentication state backed strictly by Supabase Auth.
 * Enforces email verification status before granting active user state.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';
import * as authService from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<authService.SupabaseAuthResult>;
  register: (
    name: string,
    email: string,
    role: UserRole,
    password: string,
    avatarFile?: File | null
  ) => Promise<authService.SupabaseAuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Supabase Auth state changes
  useEffect(() => {
    const supabase = createClient();

    // Initial session check
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && data.user.email_confirmed_at) {
        authService.getCurrentUser().then((u) => {
          setUser(u);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Live listener for sign-in / sign-out / token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && session.user.email_confirmed_at) {
        authService.getCurrentUser().then((u) => setUser(u));
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      role: UserRole,
      password: string,
      avatarFile?: File | null
    ) => {
      const res = await authService.register(name, email, role, password, avatarFile);
      if (res.user && !res.needsEmailVerification) {
        setUser(res.user);
      }
      return res;
    },
    []
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await authService.getCurrentUser();
    setUser(u);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    return authService.resendVerificationEmail(email);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
