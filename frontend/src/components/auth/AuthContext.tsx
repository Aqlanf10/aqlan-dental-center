'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

function setAuthCookie(token: string) {
  document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeAuthCookie() {
  document.cookie = 'auth-token=; path=/; max-age=0';
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodeJWT = (t: string): User | null => {
    try {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return {
        id: payload.sub || payload.nameid || '',
        email: payload.email || '',
        fullName: payload.fullName || payload.unique_name || '',
        role: payload.role || '',
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      const decoded = decodeJWT(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
        setAuthCookie(stored);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        removeAuthCookie();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.message || data.error || '';
      if (msg.includes('disabled') || msg.includes('معطل')) {
        throw new Error('الحساب معطل. يرجى التواصل مع الإدارة');
      }
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const data = await res.json();
    const accessToken = data.token || data.accessToken;
    const refreshToken = data.refreshToken;

    if (!accessToken) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    localStorage.setItem('token', accessToken);
    setAuthCookie(accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

    const decoded = decodeJWT(accessToken);
    setToken(accessToken);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    removeAuthCookie();
    setToken(null);
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
