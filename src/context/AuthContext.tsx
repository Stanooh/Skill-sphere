'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import * as authService from '@/services/authService';
import { seedDemoApplications } from '@/services/mentorVerificationService';

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

  useEffect(() => {
    seedDemoApplications();
    const current = authService.getCurrentUser();
    setUser(current);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = authService.login(email, password);
    if (u) setUser(u);
    return u;
  }, []);

  const register = useCallback(async (name: string, email: string, role: UserRole, _password?: string) => {
    const u = authService.register(name, email, role);
    if (u) setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(authService.getCurrentUser());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isSupabaseAuth: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
