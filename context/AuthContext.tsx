"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";

type AuthContextType = {
  session: any;
  status: "loading" | "authenticated" | "unauthenticated";
  signIn: (provider: string, options?: any) => Promise<any>;
  signOut: (options?: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  status: "loading",
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    } catch {
      setStatus("unauthenticated");
    }
  }, []);

  const signIn = async (provider: string, options?: any) => {
    if (options?.email && options?.password) {
      const user = await authService.login(options.email, options.password);
      const sessionData = { user };
      localStorage.setItem("user_session", JSON.stringify(sessionData));
      if (user?.access_token) {
        localStorage.setItem("access_token", user.access_token);
      }
      setSession(sessionData);
      setStatus("authenticated");
      if (options?.callbackUrl) {
        window.location.href = options.callbackUrl;
      } else {
        router.push("/");
      }
      return { ok: true, error: null };
    }
  };

  const signOut = async () => {
    localStorage.removeItem("user_session");
    localStorage.removeItem("access_token");
    setSession(null);
    setStatus("unauthenticated");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ session, status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useSession = () => {
  const { session, status } = useAuth();
  return { data: session, status };
};

export const signIn = async (provider: string, options?: any) => {
  if (options?.email && options?.password) {
    const user = await authService.login(options.email, options.password);
    const sessionData = { user };
    localStorage.setItem("user_session", JSON.stringify(sessionData));
    if (user?.access_token) {
      localStorage.setItem("access_token", user.access_token);
    }
    if (options?.callbackUrl) {
      window.location.href = options.callbackUrl;
    }
    return { ok: true, error: null };
  }
};

export const signOut = async () => {
  localStorage.removeItem("user_session");
  localStorage.removeItem("access_token");
  window.location.href = "/login";
};
