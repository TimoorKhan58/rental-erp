"use client";

import { memo } from "react";
import Link from "next/link";
import { ActivityIcon, FileBarChartIcon } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/config/routes";

type DashboardHeroProps = {
  organizationName: string;
  attentionCount?: number;
};

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const DashboardHero = memo(function DashboardHero({
  organizationName,
  attentionCount = 0,
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
    <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-md">
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-brand/[0.06]"
        aria-hidden="true"
      />
      <div
        className="absolute -top-16 -right-16 size-48 rounded-full bg-brand/8 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {today}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            {getGreeting()}, {userName}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {organizationName} — understand cash, rentals, and blockers in about 20
            seconds. Live numbers refresh automatically.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-muted/50 px-3 py-2">
            <ActivityIcon className="size-4 text-brand" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">
              {attentionCount > 0
                ? `${attentionCount} need attention`
                : "Live · all clear"}
            </span>
          </div>
          <Link
            href={ROUTES.reports}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            <FileBarChartIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Full reports
          </Link>
        </div>
      </div>
    </header>
  );
});
