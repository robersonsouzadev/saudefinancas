'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthToken, removeAuthToken, getAuthToken, authFetch } from '../../lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  whatsappPhone?: string;
  role: string;
  avatarUrl?: string;
  authProvider?: string;
  birthDate?: string;
  biologicalSex?: string;
  heightCm?: number;
  uazapiInstance?: string;
  uazapiToken?: string;
  timezone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  loginWithGoogle: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      setToken(currentToken);
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        // Auto-sincronizar fuso horário do dispositivo se não estiver salvo
        const deviceTz = typeof window !== 'undefined' && Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : 'America/Sao_Paulo';

        if (userData && userData.timezone !== deviceTz) {
          authFetch('/api/users/me/profile', {
            method: 'PUT',
            body: JSON.stringify({ timezone: deviceTz }),
          }).catch(() => {});
        }
      } else {
        // Token expired or invalid
        removeAuthToken();
        setUser(null);
        setToken(null);
        router.push('/login');
      }
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    router.push('/');
  };

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
