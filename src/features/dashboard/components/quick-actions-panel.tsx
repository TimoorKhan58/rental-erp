"use client";

import Link from "next/link";
import { memo } from "react";
import {
  CreditCardIcon,
  FileTextIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartIcon,
  UserPlusIcon,
} from "lucide-react";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuickAction } from "../types";

const actionIconMap: Record<string, typeof PlusIcon> = {
  "new-customer": UserPlusIcon,
  "new-rental": FileTextIcon,
  "new-invoice": FileTextIcon,
  "receive-payment": CreditCardIcon,
  "purchase-order": ShoppingCartIcon,
  "add-product": PackageIcon,
};

type QuickActionsPanelProps = {
  actions: QuickAction[];
  isLoading?: boolean;
};

export const QuickActionsPanel = memo(function QuickActionsPanel({
  actions,
  isLoading,
}: QuickActionsPanelProps) {
  if (isLoading) {
    return (
      <SectionCard title="Quick Actions" description="Common workflows">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Quick Actions"
      description="Launch common workflows — routes are placeholders until modules ship."
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = actionIconMap[action.id] ?? PlusIcon;

          return (
            <AppButton
              key={action.id}
              variant="outline"
              className="justify-start"
              leftIcon={<Icon className="size-4" aria-hidden="true" />}
              render={<Link href={action.href} />}
            >
              {action.label}
            </AppButton>
          );
        })}
      </div>
    </SectionCard>
  );
});
