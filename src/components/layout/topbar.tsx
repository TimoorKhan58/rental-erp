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
import { useAuth } from "@/hooks/use-auth";
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
import { Separator } from "@/components/ui/separator";
import { NotificationTopbarControl } from "@/features/notification";
import {
  canAccessWithPermissions,
  QUICK_ACTION_REQUIRED_ANY,
} from "@/constants/navigation-access";
import { GlobalSearchInput } from "./global-search-input";
import { useSidebar } from "./sidebar-context";
import { useVisibleNavigation } from "./use-visible-navigation";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const QUICK_ACTION_LINKS = [
  { label: "New Rental Order", href: ROUTES.rentalOrdersNew },
  { label: "New Customer", href: ROUTES.customersNew },
  { label: "Receive Payment", href: ROUTES.paymentsNew },
] as const;

export function Topbar() {
  const { openMobile, mobileOpen } = useSidebar();
  const { session, signOut } = useAuth();
  const { organizationName } = useOrganizationName();
  const { permissions, ready } = useVisibleNavigation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const quickActions = QUICK_ACTION_LINKS.filter(
    (action) =>
      !ready ||
      canAccessWithPermissions(QUICK_ACTION_REQUIRED_ANY[action.href], permissions),
  );

  const userName = session?.user.name ?? "Guest";
  const userInitials = session?.user.name ? getInitials(session.user.name) : "G";

  return (
    <header className="tent-navbar z-[var(--z-sticky)] shrink-0">
      <div className="flex h-14 items-center gap-3 px-3 md:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 lg:hidden"
          onClick={openMobile}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <MenuIcon className="size-4" aria-hidden="true" />
        </Button>

        <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              {organizationName}
            </p>
            <p className="truncate text-[11px] text-white/55">Operations workspace</p>
          </div>
          <GlobalSearchInput
            className="relative hidden min-w-0 max-w-3xl flex-1 lg:block"
            inputClassName="h-8 border-white/15 bg-white/10 pl-9 text-sm text-white placeholder:text-white/45 focus-visible:border-white/30 focus-visible:bg-white/12 focus-visible:ring-white/20"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 md:flex-none">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label="Toggle search"
            aria-expanded={mobileSearchOpen}
          >
            <SearchIcon className="size-4" aria-hidden="true" />
          </Button>

          {quickActions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <AppButton
                    variant="default"
                    size="sm"
                    className="inline-flex size-8 shrink-0 bg-brand p-0 text-brand-foreground hover:bg-brand/90 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
                    leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                    aria-label="Quick actions"
                  />
                }
              >
                <span className="hidden sm:inline">New</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {quickActions.map((action) => (
                  <DropdownMenuItem key={action.label} render={<Link href={action.href} />}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <NotificationTopbarControl className="text-white hover:bg-white/10" />

          <ThemeToggle className="text-white hover:bg-white/10" />

          <Separator orientation="vertical" className="mx-1 hidden h-5 bg-white/20 sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="gap-2 px-1.5 text-white hover:bg-white/10 sm:px-2"
                  aria-label="Open profile menu"
                />
              }
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-white/15 text-[11px] font-semibold text-white">
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
                <DropdownMenuItem
                  disabled={signingOut}
                  onClick={() => {
                    setSigningOut(true);
                    void signOut();
                  }}
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem render={<Link href={ROUTES.login} />}>
                  Sign in
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="border-t border-white/10 px-3 py-2 md:px-4 lg:hidden">
          <GlobalSearchInput
            className="relative"
            inputClassName="h-8 border-white/15 bg-white/10 pl-9 text-sm text-white placeholder:text-white/45 focus-visible:border-white/30 focus-visible:bg-white/12 focus-visible:ring-white/20"
            autoFocus
            onNavigate={() => setMobileSearchOpen(false)}
          />
        </div>
      ) : null}
    </header>
  );
}
