"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavigationArea } from "@/constants/navigation.types";
import { findActiveNavigation } from "./nav-active";
import { useVisibleNavigation } from "./use-visible-navigation";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
};

/**
 * The main menu: one entry per area (UI redesign). An area opens on its
 * first section; the other sections are tabs at the top of the page.
 */
export function SidebarNav({
  collapsed = false,
  onNavigate,
  className,
}: SidebarNavProps) {
  const pathname = usePathname();
  const { areas, settingsArea } = useVisibleNavigation();
  const all = settingsArea ? [...areas, settingsArea] : areas;
  const activeAreaId = findActiveNavigation(pathname, all)?.area.id ?? null;

  return (
    <nav
      aria-label="Main navigation"
      className={cn("flex flex-1 flex-col gap-0.5 px-2 py-1", className)}
    >
      <ul className="flex flex-col gap-0.5">
        {areas.map((area) => (
          <AreaLink
            key={area.id}
            area={area}
            active={area.id === activeAreaId}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
      {settingsArea ? (
        <ul
          className={cn(
            "mt-3 flex flex-col gap-0.5 border-t border-sidebar-border pt-3",
            collapsed && "mt-2 pt-2",
          )}
        >
          <AreaLink
            area={settingsArea}
            active={settingsArea.id === activeAreaId}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </ul>
      ) : null}
    </nav>
  );
}

function AreaLink({
  area,
  active,
  collapsed,
  onNavigate,
}: {
  area: NavigationArea;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = area.icon;
  const href = area.sections[0]?.href ?? "/";

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        title={collapsed ? area.label : undefined}
        aria-label={collapsed ? area.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          active
            ? "nav-active-indicator bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-2",
        )}
      >
        <Icon
          className={cn(
            "size-[18px] shrink-0",
            active ? "text-sidebar-primary" : "text-sidebar-foreground/70",
          )}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">{area.label}</span>}
      </Link>
    </li>
  );
}
