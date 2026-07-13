"use client";

import { memo } from "react";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/utils";
import { Typography } from "@/components/design-system/typography";
import { AppBreadcrumb } from "@/components/design-system/navigation";

type WelcomeHeaderProps = {
  organizationName: string;
};

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const WelcomeHeader = memo(function WelcomeHeader({
  organizationName,
}: WelcomeHeaderProps) {
  const { data: session } = useSession();
  const userName = session?.user.name ?? "User";
  const today = formatDate(new Date(), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="space-y-1">
      <AppBreadcrumb items={[{ label: "Dashboard" }]} />
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-0.5">
          <Typography variant="h1" as="h1" className="font-sans tracking-tight">
            {getGreeting()}, {userName}
          </Typography>
          <Typography variant="body" tone="muted" className="font-sans">
            {organizationName}
            <span className="mx-2 text-border" aria-hidden="true">
              ·
            </span>
            <time dateTime={new Date().toISOString().slice(0, 10)}>{today}</time>
          </Typography>
        </div>
      </div>
    </header>
  );
});
