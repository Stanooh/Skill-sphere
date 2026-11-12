'use client';

import {
  createContext,
  useContext,
  useSyncExternalStore,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '@/types';
import * as authService from '@/services/authService';
import { seedDemoApplications } from '@/services/mentorVerificationService';
import { seedMockRecommendations } from '@/services/recommendationService';

const AUTH_CHANGE_EVENT = 'skillsphere:auth-change';
let authRevision = 0;

function subscribeToAuth(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
  };
}

function getAuthSnapshot(): string {
  return `${authRevision}:${authService.getCurrentUserId() ?? ''}`;
}

function getServerAuthSnapshot(): string {
  return '0:';
}

function notifyAuthChanged(): void {
  authRevision += 1;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

function subscribeToNothing(): () => void {
  return () => {};
}

function getHydratedSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, role: UserRole, password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authSnapshot = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getServerAuthSnapshot
  );
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    getHydratedSnapshot,
    getServerHydrationSnapshot
  );
  const userId = authSnapshot.slice(authSnapshot.indexOf(':') + 1);
  const user: User | null = userId ? authService.getCurrentUser() : null;
  const loading = !hydrated;

  useEffect(() => {
    seedDemoApplications();
    seedMockRecommendations();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = authService.login(email, password);
    if (u) notifyAuthChanged();
    return u;
  }, []);

  const register = useCallback(async (name: string, email: string, role: UserRole) => {
    const u = authService.register(name, email, role);
    if (u) notifyAuthChanged();
    return u;
  }, []);

  const logout = useCallback(async () => {
    authService.logout();
    notifyAuthChanged();
  }, []);

  const refreshUser = useCallback(async () => {
    notifyAuthChanged();
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
