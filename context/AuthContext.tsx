"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { SessionResponse, SessionUserResponse } from "@/models";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { subscribeToUnauthorizedEvent } from "@/helpers/api/authEvents";

type SignInOptions = {
  email?: string;
  password?: string;
  callbackUrl?: string;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextType = {
  session: SessionResponse | null;
  status: AuthStatus;
  hasAdminAccess: boolean;
  signIn: (provider: string, options?: SignInOptions) => Promise<{ ok: boolean; error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  status: "loading",
  hasAdminAccess: false,
  signIn: async () => ({ ok: false, error: "not_ready" }),
  signOut: async () => {},
});

function hasActiveAdminAccess(user?: SessionUserResponse | null) {
  return user?.role === "admin" && user?.status === "ACTIVE";
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const router = useRouter();

  const clearSession = useCallback((redirectToLogin: boolean) => {
    setSession(null);
    setStatus("unauthenticated");
    if (redirectToLogin) {
      router.replace("/login");
    }
  }, [router]);

  const loadSession = useCallback(async () => {
    try {
      const currentSession = await authService.getSession();
      if (!hasActiveAdminAccess(currentSession.user)) {
        await authService.logout();
        clearSession(true);
        return;
      }

      setSession(currentSession);
      setStatus("authenticated");
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        clearSession(false);
        return;
      }

      clearSession(false);
      throw error;
    }
  }, [clearSession]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    return subscribeToUnauthorizedEvent(() => {
      clearSession(true);
    });
  }, [clearSession]);

  const signIn = async (_provider: string, options?: SignInOptions) => {
    try {
      if (!options?.email || !options.password) {
        throw new Error("Email ve şifre gereklidir");
      }

      const nextSession = await authService.login(options.email, options.password);
      if (!hasActiveAdminAccess(nextSession.user)) {
        await authService.logout();
        clearSession(false);
        throw new Error("Bu hesap aktif bir yönetici hesabı değil.");
      }

      setSession(nextSession);
      setStatus("authenticated");

      if (options.callbackUrl) {
        window.location.href = options.callbackUrl;
      } else {
        router.push("/");
      }

      return { ok: true, error: null };
    } catch (error) {
      clearSession(false);
      throw error;
    }
  };

  const signOut = async () => {
    await authService.logout();
    clearSession(true);
  };

  const hasAdminAccess = useMemo(() => hasActiveAdminAccess(session?.user), [session]);

  return (
    <AuthContext.Provider value={{ session, status, hasAdminAccess, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useSession = () => {
  const { session, status } = useAuth();
  return { data: session, status };
};
