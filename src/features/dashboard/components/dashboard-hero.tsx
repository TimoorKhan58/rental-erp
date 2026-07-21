"use client";

import { memo } from "react";
import { LayoutDashboardIcon } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/utils";

type DashboardHeroProps = {
  organizationName: string;
};

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const DashboardHero = memo(function DashboardHero({
  organizationName,
}: DashboardHeroProps) {
  const { data: session } = useSession();
  const userName = session?.user.name ?? "User";
  const today = formatDate(new Date(), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="space-y-1">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-soft">
          <LayoutDashboardIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground">{organizationName}</p>
        </div>
      </div>
    </header>
  );
});
