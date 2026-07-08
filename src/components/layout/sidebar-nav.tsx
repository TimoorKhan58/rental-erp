"use client";

import { NAVIGATION_ITEMS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function SidebarNav({
  collapsed = false,
  onNavigate,
  className,
}: SidebarNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn("flex flex-1 flex-col gap-1 px-2 py-2", className)}
    >
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <a
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </a>
        );
      })}
    </nav>
  );
}
