import type { ReactNode } from "react";
import { requireActiveSession } from "@/lib/auth/session";
import { DashboardLayout } from "@/layouts";
import { ErrorBoundary } from "@/components/feedback";
import { ProtectedRoute } from "@/lib/auth/protected-route";

type AppGroupLayoutProps = {
  children: ReactNode;
};

export default async function AppGroupLayout({ children }: AppGroupLayoutProps) {
  await requireActiveSession();

  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <DashboardLayout>{children}</DashboardLayout>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
