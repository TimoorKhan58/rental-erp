"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/hooks/use-auth";
import { FullPageLoader } from "@/components/loading";

type ProtectedRouteProps = {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
};

export function ProtectedRoute({
  children,
  fallback,
  redirectTo = ROUTES.login,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.replace(`${redirectTo}?callbackUrl=${callbackUrl}`);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  if (isLoading) {
    return fallback ?? <FullPageLoader label="Checking session..." />;
  }

  if (!isAuthenticated) {
    return fallback ?? <FullPageLoader label="Redirecting to sign in..." />;
  }

  return children;
}
