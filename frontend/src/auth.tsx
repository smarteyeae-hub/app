import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, AuthUser, saveAuth, loadAuth, clearAuth } from "./api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthState>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { token, user: u } = await loadAuth();
    if (!token || !u) { setUser(null); setLoading(false); return; }
    setUser(u);
    setLoading(false);
    try { const fresh = await api.me(); setUser(fresh); } catch { await clearAuth(); setUser(null); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await saveAuth(res.access_token, res.user);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => { await clearAuth(); setUser(null); }, []);

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
