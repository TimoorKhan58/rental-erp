"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/auth/client";
import { navigateToServerLogout } from "@/lib/auth/navigate-to-server-logout";

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
  const { data: session, isPending } = useSession();

  const handleSignOut = useCallback(async () => {
    navigateToServerLogout();
  }, []);

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
