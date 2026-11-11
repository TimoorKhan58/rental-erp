"use client";

import { memo } from "react";
import Link from "next/link";
import { FileBarChartIcon, PlusIcon } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import { AppButton } from "@/components/design-system/button";
import { Badge } from "@/components/ui/badge";

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

/**
 * Command area — compact title, date/context, attention state, primary CTAs.
 */
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
    <header className="border-b border-border pb-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-[length:var(--text-h1)] font-semibold leading-[var(--leading-tight)] tracking-tight text-foreground">
            Operations Control Center
          </h1>
          <p className="text-[length:var(--text-caption)] text-muted-foreground">
            <span className="font-medium text-foreground/80">{today}</span>
            <span className="mx-1.5 text-border" aria-hidden="true">
              ·
            </span>
            {getGreeting()}, {userName}
            <span className="mx-1.5 text-border" aria-hidden="true">
              ·
            </span>
            {organizationName}
          </p>
          <p className="max-w-2xl text-[length:var(--text-body)] leading-snug text-muted-foreground">
            What needs action today, what is in the field, and how the business is
            performing.
          </p>
          <div className="pt-0.5">
            {attentionCount > 0 ? (
              <Badge variant="warning" aria-label={`${attentionCount} items need attention`}>
                {attentionCount} need attention
              </Badge>
            ) : (
              <Badge variant="success">All clear</Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AppButton
            variant="default"
            size="default"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.rentalOrdersNew} />}
          >
            New rental order
          </AppButton>
          <AppButton
            variant="outline"
            size="default"
            leftIcon={<FileBarChartIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.reports} />}
          >
            Reports
          </AppButton>
          <AppButton
            variant="outline"
            size="default"
            render={<Link href={ROUTES.rentalOrdersCalendar} />}
          >
            Calendar
          </AppButton>
        </div>
      </div>
    </header>
  );
});
