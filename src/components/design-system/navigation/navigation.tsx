"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppIcon } from "@/components/design-system/icons";

/**
 * SidebarItem — reusable navigation item primitive.
 *
 * @example
 * <SidebarItem href="/" label="Home" icon={HomeIcon} />
 */
type SidebarItemProps = {
  href: string;
  label: string;
  icon?: LucideIcon;
  collapsed?: boolean;
  disabled?: boolean;
};

export function SidebarItem({
  href,
  label,
  icon: Icon,
  collapsed = false,
  disabled = false,
}: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={disabled ? "#" : href}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-token",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        disabled && "pointer-events-none opacity-[var(--opacity-disabled)]",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? label : undefined}
    >
      {Icon ? <AppIcon icon={Icon} size="sm" decorative /> : null}
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

/** SidebarGroup — labeled navigation group. */
export function SidebarGroup({
  label,
  children,
  collapsed = false,
}: {
  label: string;
  children: ReactNode;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <div className="space-y-1">
      <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

/** SidebarSection — vertical section with optional divider. */
export function SidebarSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <nav className={cn("space-y-4 px-2 py-2", className)}>{children}</nav>;
}

/** NavigationDivider — sidebar separator. */
export function NavigationDivider({ className }: { className?: string }) {
  return <Separator className={cn("bg-sidebar-border", className)} />;
}

/** TopNavigation — horizontal top nav container. */
export function TopNavigation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-3 border-b border-border bg-background px-4",
        className,
      )}
    >
      {children}
    </header>
  );
}

/** UserMenu — slot container for user profile dropdown area. */
export function UserMenu({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)} role="group" aria-label="User menu">
      {children}
    </div>
  );
}

export type BreadcrumbEntry = {
  label: string;
  href?: string;
};

/**
 * AppBreadcrumb — accessible breadcrumb trail.
 *
 * @example
 * <AppBreadcrumb items={[{ label: "Home", href: "/" }, { label: "Customers" }]} />
 */
export function AppBreadcrumb({ items }: { items: BreadcrumbEntry[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <BreadcrumbItem key={`${item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              {item.href && !isLast ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
