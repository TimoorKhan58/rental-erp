"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { signOut, useSession } from "@/lib/auth/client";
import { clearAuthStorage } from "@/lib/auth/token-storage";

type AuthContextValue = {
  session: ReturnType<typeof useSession>["data"];
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleSignOut = useCallback(async () => {
    await signOut();
    clearAuthStorage();
    router.push(ROUTES.login);
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: session ?? null,
      isAuthenticated: Boolean(session),
      isLoading: isPending,
      signOut: handleSignOut,
    }),
    [handleSignOut, isPending, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider.");
  }

  return context;
}
