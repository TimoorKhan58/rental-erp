"use client";

import Link from "next/link";
import { BellIcon, MenuIcon, UserIcon } from "lucide-react";
import { APPLICATION } from "@/constants/application";
import { useSession } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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
import { useSidebar } from "./sidebar-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Topbar() {
  const { openMobile } = useSidebar();
  const { data: session } = useSession();

  const userName = session?.user.name ?? "Guest";
  const userInitials = session?.user.name ? getInitials(session.user.name) : "G";

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={openMobile}
        aria-label="Open navigation menu"
      >
        <MenuIcon className="size-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="truncate text-sm font-semibold lg:hidden">
          {APPLICATION.name}
        </span>
        <span className="hidden text-sm font-semibold lg:inline">
          {APPLICATION.client}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          disabled
        >
          <BellIcon className="size-4" />
        </Button>

        <ThemeToggle />

        <Separator orientation="vertical" className="mx-1 h-6" />

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
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {userInitials}
            </span>
            <span className="hidden max-w-32 truncate text-sm sm:inline">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{session?.user.email ?? "Not signed in"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            {session ? (
              <DropdownMenuItem render={<Link href="/logout" />}>
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem render={<Link href="/login" />}>
                Sign in
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
