"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Sidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { data: session } = useSession();
  const userName = session?.user.name ?? "Guest";
  const userEmail = session?.user.email ?? "";
  const userInitials = session?.user.name ? getInitials(session.user.name) : "G";

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-soft transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-[3.75rem] items-center border-b border-sidebar-border/60 px-3",
          collapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        {!collapsed && <BrandLogo size="sm" showTagline />}
        {collapsed && <BrandLogo size="icon" />}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <PanelLeftCloseIcon className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center border-b border-sidebar-border/60 py-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <PanelLeftOpenIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-1 py-2">
        <SidebarNav collapsed={collapsed} />
      </div>

      {!collapsed && (
        <>
          <Separator className="bg-sidebar-border/60" />
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-brand/20">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{userName}</p>
              {userEmail ? (
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
