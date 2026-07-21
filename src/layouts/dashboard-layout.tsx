import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";

type DashboardLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function DashboardLayout({ children, footer }: DashboardLayoutProps) {
  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        {children}
        {footer ? (
          <footer className="shrink-0 border-t border-border bg-background px-4 py-3 text-xs text-muted-foreground md:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </AppShell>
  );
}
