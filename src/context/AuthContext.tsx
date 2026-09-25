import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import * as authService from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => User | null;
  register: (name: string, email: string, role: UserRole) => User | null;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

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
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
