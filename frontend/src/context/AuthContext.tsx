'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  LoginPayload,
  RegisterPayload,
  ProfileUpdatePayload,
} from '@/types/auth';
import { authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload, redirectTo?: string | null) => Promise<void>;
  register: (payload: RegisterPayload, redirectTo?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Only same-site relative paths are allowed as post-login destinations,
 * so a crafted `?next=` link cannot send users to another site.
 */
export function safeRedirectPath(candidate?: string | null): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return '/dashboard';
  }
  return candidate;
}

/** Reads `?next=` from the current URL without requiring a Suspense boundary. */
export function readNextParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('next');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      // Initialize CSRF
      await authApi.getCsrf();
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (payload: LoginPayload, redirectTo?: string | null) => {
    const res = await authApi.login(payload);
    setUser(res.user);
    router.push(safeRedirectPath(redirectTo));
  };

  const register = async (payload: RegisterPayload, redirectTo?: string | null) => {
    const res = await authApi.register(payload);
    setUser(res.user);
    router.push(safeRedirectPath(redirectTo));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const updateProfile = async (payload: ProfileUpdatePayload) => {
    const updated = await authApi.updateProfile(payload);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

