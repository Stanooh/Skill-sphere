'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import * as authService from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => User | null;
  register: (name: string, email: string, role: UserRole) => User | null;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = authService.getCurrentUser();
    setUser(current);
    setLoading(false);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const u = authService.login(email, password);
    if (u) setUser(u);
    return u;
  }, []);

  const register = useCallback((name: string, email: string, role: UserRole) => {
    const u = authService.register(name, email, role);
    if (u) setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    setUser(authService.getCurrentUser());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
