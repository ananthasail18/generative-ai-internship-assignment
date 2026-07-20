"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "@/lib/api";
import { auth } from "@/lib/config";
import type { User } from "@/types";

const DEMO_TOKEN = "demo-token-";
const DEMO_USER_KEY = "courseforge_demo_user";

function readDemoUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DEMO_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginWithToken: (token: string) => Promise<User>;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!auth.token) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (auth.token.startsWith(DEMO_TOKEN)) {
      const demo = readDemoUser();
      if (demo) {
        setUser(demo);
        setLoading(false);
        return;
      }
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      const demo = readDemoUser();
      if (auth.token.startsWith(DEMO_TOKEN) && demo) {
        setUser(demo);
      } else {
        auth.clear();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const loginWithToken = useCallback(async (token: string) => {
    auth.setToken(token);
    if (token.startsWith(DEMO_TOKEN)) {
      const demo = readDemoUser();
      if (demo) {
        setUser(demo);
        return demo;
      }
    }
    try {
      const me = await api.me();
      setUser(me);
      return me;
    } catch {
      const demo = readDemoUser();
      if (token.startsWith(DEMO_TOKEN) && demo) {
        setUser(demo);
        return demo;
      }
      throw new Error("Could not fetch user profile");
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(() => {
    auth.clear();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_USER_KEY);
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      loginWithToken,
      refresh,
      logout,
    }),
    [user, loading, loginWithToken, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
