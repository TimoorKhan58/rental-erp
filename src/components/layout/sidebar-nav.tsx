"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./nav-active";
import { useVisibleNavigation } from "./use-visible-navigation";

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
  const pathname = usePathname();
  const { groups } = useVisibleNavigation();
  const allHrefs = groups.flatMap((group) => group.items.map((item) => item.href));

  return (
    <nav
      aria-label="Main navigation"
      className={cn("flex flex-1 flex-col gap-0.5 px-2 py-1", className)}
    >
      {groups.map((group, groupIndex) => (
        <div
          key={group.label}
          className={cn(
            groupIndex > 0 && !collapsed && "mt-2 border-t border-sidebar-border pt-2",
            groupIndex > 0 && collapsed && "mt-1.5 border-t border-sidebar-border pt-1.5",
          )}
        >
          {!collapsed && (
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(pathname, item.href, allHrefs);

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive
                        ? "nav-active-indicator bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/70",
                      )}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
