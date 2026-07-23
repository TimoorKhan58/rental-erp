"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION_GROUPS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
};

function isNavItemActive(
  pathname: string,
  href: string,
  allHrefs: readonly string[],
): boolean {
  const matches = allHrefs.filter(
    (candidate) =>
      pathname === candidate ||
      (candidate !== "/" && pathname.startsWith(`${candidate}/`)),
  );

  if (matches.length === 0) {
    return false;
  }

  const bestMatch = matches.reduce((longest, current) =>
    current.length > longest.length ? current : longest,
  );

  return bestMatch === href;
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
  className,
}: SidebarNavProps) {
  const pathname = usePathname();
  const allHrefs = NAVIGATION_GROUPS.flatMap((group) =>
    group.items.map((item) => item.href),
  );

  return (
    <nav
      aria-label="Main navigation"
      className={cn("flex flex-1 flex-col gap-1 px-2 py-2", className)}
    >
      {NAVIGATION_GROUPS.map((group, groupIndex) => (
        <div
          key={group.label}
          className={cn(
            groupIndex > 0 && !collapsed && "mt-2 border-t border-sidebar-border/60 pt-2",
            groupIndex > 0 && collapsed && "mt-1 border-t border-sidebar-border/40 pt-1",
          )}
        >
          {!collapsed && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
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
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive
                        ? "nav-active-indicator bg-sidebar-accent font-medium text-primary shadow-soft"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0",
                        isActive ? "text-brand" : "text-sidebar-foreground/60",
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
