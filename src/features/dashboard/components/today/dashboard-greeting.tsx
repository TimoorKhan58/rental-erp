"use client";

import Link from "next/link";
import { CalendarDaysIcon, PlusIcon, WalletIcon } from "lucide-react";

import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/utils";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Who and when, plus the three things people start most often (usability revamp R2). */
export function DashboardGreeting({ organizationName }: { organizationName: string }) {
  const { data: session } = useSession();
  const firstName = session?.user.name?.trim().split(/\s+/)[0];
  const now = new Date();

  return (
    <header className="flex flex-col gap-3 pb-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm text-muted-foreground">
          {formatDate(now, { weekday: "long", day: "numeric", month: "long" })}
          {organizationName ? ` · ${organizationName}` : ""}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {greeting(now.getHours())}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <AppButton render={<Link href={ROUTES.rentalOrdersNew} />} leftIcon={<PlusIcon className="size-4" />}>
          New rental order
        </AppButton>
        <AppButton variant="outline" render={<Link href={ROUTES.paymentsNew} />} leftIcon={<WalletIcon className="size-4" />}>
          Receive payment
        </AppButton>
        <AppButton
          variant="outline"
          render={<Link href={ROUTES.rentalOrdersCalendar} />}
          leftIcon={<CalendarDaysIcon className="size-4" />}
        >
          Calendar
        </AppButton>
      </div>
    </header>
  );
}
