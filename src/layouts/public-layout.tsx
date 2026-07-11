import type { ReactNode } from "react";

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      {children}
    </main>
  );
}
