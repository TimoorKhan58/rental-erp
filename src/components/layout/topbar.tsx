"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MenuIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import { useOrganizationName } from "@/features/settings/hooks";
import { useSession } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AppButton } from "@/components/design-system/button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  { label: "New Rental Order", href: ROUTES.rentalOrders },
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
    <header className="tent-navbar z-[var(--z-sticky)] flex h-[3.75rem] shrink-0 items-center gap-3 px-4">
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-white/10 lg:hidden"
        onClick={openMobile}
        aria-label="Open navigation menu"
      >
        <MenuIcon className="size-4" aria-hidden="true" />
      </Button>

      <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{organizationName}</p>
          <p className="truncate text-[11px] text-white/60">Operations workspace</p>
        </div>
        <div className="relative hidden max-w-md flex-1 lg:block">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers, orders, products..."
            className="h-9 border-white/15 bg-white/10 pl-9 text-sm text-white placeholder:text-white/45 focus-visible:border-white/30 focus-visible:bg-white/15"
            aria-label="Global search"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 md:flex-none">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <AppButton
                variant="default"
                size="sm"
                className="hidden bg-brand text-brand-foreground shadow-soft hover:bg-brand/90 sm:inline-flex"
                leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                aria-label="Quick actions"
              />
            }
          >
            New
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {QUICK_ACTION_LINKS.map((action) => (
              <DropdownMenuItem key={action.label} render={<Link href={action.href} />}>
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationTopbarControl className="text-white hover:bg-white/10" />

        <ThemeToggle className="text-white hover:bg-white/10" />

        <Separator orientation="vertical" className="mx-1 hidden h-6 bg-white/20 sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="gap-2 px-2 text-white hover:bg-white/10"
                aria-label="Open profile menu"
              />
            }
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white ring-2 ring-brand/40">
              {userInitials}
            </span>
            <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {session?.user.email ?? "Not signed in"}
                </p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
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
