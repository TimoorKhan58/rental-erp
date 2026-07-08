"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { APPLICATION } from "@/constants/application";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-context";

export function Sidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        {!collapsed && (
          <span className="truncate text-sm font-semibold">{APPLICATION.name}</span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-4" />
          ) : (
            <PanelLeftCloseIcon className="size-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>

      {!collapsed && (
        <>
          <Separator className="bg-sidebar-border" />
          <div className="px-4 py-3 text-xs text-muted-foreground">
            v{APPLICATION.version}
          </div>
        </>
      )}
    </aside>
  );
}
