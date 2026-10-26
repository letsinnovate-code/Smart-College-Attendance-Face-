'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, UserRole, ApiResponse } from '@/types';
import { apiClient, setAccessToken, getAccessToken } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await apiClient<ApiResponse<User>>('/auth/me');
      if (res?.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Try restoring session from HttpOnly refresh cookie on initial mount
  useEffect(() => {
    async function initAuth() {
      try {
        // Attempt a token refresh first to obtain an in-memory access token
        const refreshRes = await apiClient<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
          method: 'POST',
          skipAuth: true,
        });
        if (refreshRes?.data?.accessToken) {
          setAccessToken(refreshRes.data.accessToken);
          await fetchCurrentUser();
          return;
        }
      } catch {
        // No valid session cookie found
      }
      setIsLoading(false);
    }

    initAuth();

    function handleSessionExpired() {
      setUser(null);
      setAccessToken(null);
      router.push('/login?expired=1');
    }

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [fetchCurrentUser, router]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiClient<ApiResponse<{ accessToken: string; user: User }>>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });

    if (res?.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }

    // Populate user profile via /auth/me for complete relations
    const meRes = await apiClient<ApiResponse<User>>('/auth/me');
    const loggedInUser = meRes.data || res.data.user;
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        refreshUser: fetchCurrentUser,
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
