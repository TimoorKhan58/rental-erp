"use client";

import type { ReactNode } from "react";
import { MobileSidebar } from "./mobile-sidebar";
import { Sidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";
import { Topbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <MobileSidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <Topbar />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}
