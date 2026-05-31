'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

function setAuthCookie(token: string) {
  document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeAuthCookie() {
  document.cookie = 'auth-token=; path=/; max-age=0';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (usernameOrEmail: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  changePassword: async () => ({ success: false, message: '' }),
  forgotPassword: async () => ({ success: false, message: '' }),
  resetPassword: async () => ({ success: false, message: '' }),
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
        mustChangePassword: payload.mustChangePassword === 'true',
      };
    } catch {
      return null;
    }
  };

  const fetchMe = useCallback(async (accessToken: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id || '',
          email: data.email || '',
          fullName: data.fullName || '',
          role: data.roles?.[0] || '',
          mustChangePassword: data.mustChangePassword || false,
        };
      }
    } catch {
      // Ignore fetch errors
    }
    return null;
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      const decoded = decodeJWT(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
        setAuthCookie(stored);
        // Fetch latest user info from server
        fetchMe(stored).then(serverUser => {
          if (serverUser) {
            setUser(serverUser);
          }
        });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        removeAuthCookie();
      }
    }
    setIsLoading(false);
  }, [fetchMe]);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrPhone, password }),
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
    const accessToken = data.accessToken;
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

    // Check if user must change password
    if (data.mustChangePassword || decoded?.mustChangePassword) {
      if (decoded) {
        setUser({ ...decoded, mustChangePassword: true });
      }
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const currentToken = localStorage.getItem('token');

    try {
      if (currentToken && refreshToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Ignore logout API errors
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    removeAuthCookie();
    setToken(null);
    setUser(null);
    window.location.href = '/';
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return { success: false, message: 'يرجى تسجيل الدخول أولاً' };

    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'فشل في تغيير كلمة المرور' };
      }

      // Update token if new one provided
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        setAuthCookie(data.accessToken);
        const decoded = decodeJWT(data.accessToken);
        setToken(data.accessToken);
        if (decoded) {
          setUser({ ...decoded, mustChangePassword: false });
        }
      } else {
        // Clear mustChangePassword flag
        if (user) {
          setUser({ ...user, mustChangePassword: false });
        }
      }

      return { success: true, message: data.message || 'تم تغيير كلمة المرور بنجاح' };
    } catch {
      return { success: false, message: 'حدث خطأ في الاتصال. يرجى المحاولة لاحقاً' };
    }
  }, [user]);

  const forgotPassword = useCallback(async (usernameOrEmail: string): Promise<{ success: boolean; message: string; resetToken?: string }> => {
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail }),
      });

      const data = await res.json();

      return {
        success: data.success !== false,
        message: data.message || 'إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة تعيين كلمة المرور',
        resetToken: data.resetToken,
      };
    } catch {
      return { success: false, message: 'حدث خطأ في الاتصال. يرجى المحاولة لاحقاً' };
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'فشل في إعادة تعيين كلمة المرور' };
      }

      return { success: true, message: data.message || 'تم إعادة تعيين كلمة المرور بنجاح' };
    } catch {
      return { success: false, message: 'حدث خطأ في الاتصال. يرجى المحاولة لاحقاً' };
    }
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
        changePassword,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
