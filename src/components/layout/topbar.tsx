"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MenuIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import { useOrganizationName } from "@/features/settings/hooks";
import { useSession } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { NotificationTopbarControl } from "@/features/notification";
import { useSidebar } from "./sidebar-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const QUICK_ACTION_LINKS = [
  { label: "New Customer", href: ROUTES.customersNew },
  { label: "New Rental", href: ROUTES.rentalOrders },
  { label: "Receive Payment", href: ROUTES.payments },
] as const;

export function Topbar() {
  const { openMobile } = useSidebar();
  const { data: session } = useSession();
  const { organizationName } = useOrganizationName();
  const [search, setSearch] = useState("");

  const userName = session?.user.name ?? "Guest";
  const userInitials = session?.user.name ? getInitials(session.user.name) : "G";

  return (
    <header className="z-[var(--z-sticky)] flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={openMobile}
        aria-label="Open navigation menu"
      >
        <MenuIcon className="size-4" aria-hidden="true" />
      </Button>

      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <span className="truncate text-sm font-semibold">{organizationName}</span>
        <div className="hidden max-w-sm flex-1 lg:block">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search customers, orders, products..."
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 md:flex-none">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <AppButton
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                aria-label="Quick actions"
              />
            }
          >
            Quick Actions
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUICK_ACTION_LINKS.map((action) => (
              <DropdownMenuItem key={action.label} render={<Link href={action.href} />}>
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationTopbarControl />

        <ThemeToggle />

        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="gap-2 px-2"
                aria-label="Open profile menu"
              />
            }
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {userInitials}
            </span>
            <span className="hidden max-w-32 truncate text-sm sm:inline">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{session?.user.email ?? "Not signed in"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={ROUTES.settingsProfile} />}>
              <UserIcon aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={ROUTES.settings} />}>
              <SettingsIcon aria-hidden="true" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {session ? (
              <DropdownMenuItem render={<Link href={ROUTES.logout} />}>
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem render={<Link href={ROUTES.login} />}>
                Sign in
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
