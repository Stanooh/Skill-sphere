'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import * as authService from '@/services/authService';
import { supabase } from '@/lib/supabase';
import { ensureProfile, getProfileRole } from '@/services/mentorVerificationService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, role: UserRole, password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSupabaseAuth: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupabaseAuth, setIsSupabaseAuth] = useState(false);

  // Check for Supabase session on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          // User has a Supabase session — fetch their profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role, display_name, email')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile && mounted) {
            const supabaseUser: User = {
              id: profile.id,
              role: profile.role as UserRole,
              name: profile.display_name || session.user.email || '',
              email: profile.email || session.user.email || '',
              avatar: `https://i.pravatar.cc/150?u=${profile.email}`,
              createdAt: session.user.created_at || new Date().toISOString(),
            };
            setUser(supabaseUser);
            setIsSupabaseAuth(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Supabase not reachable or no session — fall through to demo auth
      }

      // Fall back to demo (localStorage) auth
      if (mounted) {
        const current = authService.getCurrentUser();
        setUser(current);
        setIsSupabaseAuth(false);
        setLoading(false);
      }
    })();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        // Only clear if we were using Supabase auth
        if (isSupabaseAuth) {
          setUser(null);
          setIsSupabaseAuth(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, display_name, email')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile && mounted) {
          const supabaseUser: User = {
            id: profile.id,
            role: profile.role as UserRole,
            name: profile.display_name || session.user.email || '',
            email: profile.email || session.user.email || '',
            avatar: `https://i.pravatar.cc/150?u=${profile.email}`,
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setUser(supabaseUser);
          setIsSupabaseAuth(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Try Supabase auth first
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (data.user && !error) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, display_name, email')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile) {
          const supabaseUser: User = {
            id: profile.id,
            role: profile.role as UserRole,
            name: profile.display_name || email,
            email: profile.email || email,
            avatar: `https://i.pravatar.cc/150?u=${email}`,
            createdAt: data.user.created_at || new Date().toISOString(),
          };
          setUser(supabaseUser);
          setIsSupabaseAuth(true);
          return supabaseUser;
        }
      }
    } catch {
      // Fall through to demo auth
    }

    // Fall back to demo (localStorage) auth
    const u = authService.login(email, password);
    if (u) {
      setUser(u);
      setIsSupabaseAuth(false);
    }
    return u;
  }, []);

  const register = useCallback(async (name: string, email: string, role: UserRole, password?: string) => {
    // Try Supabase auth first
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: password || 'temp-pass-123' });
      if (data.user && !error) {
        // Create profile as learner (never admin, never mentor automatically)
        await ensureProfile(name, email);

        const supabaseUser: User = {
          id: data.user.id,
          role: 'learner',
          name,
          email,
          avatar: `https://i.pravatar.cc/150?u=${email}`,
          createdAt: data.user.created_at || new Date().toISOString(),
        };
        setUser(supabaseUser);
        setIsSupabaseAuth(true);
        return supabaseUser;
      }
    } catch {
      // Fall through to demo auth
    }

    // Fall back to demo (localStorage) auth
    const u = authService.register(name, email, role);
    if (u) {
      setUser(u);
      setIsSupabaseAuth(false);
    }
    return u;
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseAuth) {
      await supabase.auth.signOut();
    }
    authService.logout();
    setUser(null);
    setIsSupabaseAuth(false);
  }, [isSupabaseAuth]);

  const refreshUser = useCallback(async () => {
    if (isSupabaseAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, display_name, email')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          const supabaseUser: User = {
            id: profile.id,
            role: profile.role as UserRole,
            name: profile.display_name || session.user.email || '',
            email: profile.email || session.user.email || '',
            avatar: `https://i.pravatar.cc/150?u=${profile.email}`,
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setUser(supabaseUser);
          return;
        }
      }
    }
    setUser(authService.getCurrentUser());
  }, [isSupabaseAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isSupabaseAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Re-export for convenience
export { getProfileRole };
