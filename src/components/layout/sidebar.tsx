"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon, TentIcon } from "lucide-react";
import { APPLICATION } from "@/constants/application";
import { useSession } from "@/lib/auth/client";
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
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center px-3",
          collapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <TentIcon className="size-4" aria-hidden="true" />
            </div>
            <span className="truncate font-heading text-sm font-semibold text-foreground">
              {APPLICATION.name}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent/60"
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftCloseIcon className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-1 py-1">
        <SidebarNav collapsed={collapsed} />
      </div>

      {!collapsed && (
        <>
          <Separator className="bg-sidebar-border" />
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
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
