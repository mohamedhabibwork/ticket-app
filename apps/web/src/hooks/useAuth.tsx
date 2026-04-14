"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface User {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  organizationId: number;
  locale: string;
  timezone: string;
  isPlatformAdmin: boolean;
  roles: { id: number; name: string; slug: string }[];
}

interface AuthContextType {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { sessionToken: string; user: User }) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SESSION_TOKEN: "sessionToken",
  USER: "user",
} as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setSessionToken(storedToken);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((data: { sessionToken: string; user: User }) => {
    localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.sessionToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    setSessionToken(data.sessionToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setSessionToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isLoading,
        isAuthenticated: !!sessionToken && !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useSessionToken() {
  const { sessionToken, isLoading } = useAuth();
  return { sessionToken, isLoading };
}

export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}
