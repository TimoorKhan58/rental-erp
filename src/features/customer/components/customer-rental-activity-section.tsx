"use client";

import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { useRentalOrders } from "@/features/rental-order/hooks";
import { RentalOrderStatusBadge } from "@/features/rental-order/components";

type CustomerRentalActivitySectionProps = {
  customerId: string;
};

/**
 * Presentation of existing rental-order list API filtered by customerId.
 * Does not invent activity metrics.
 */
export function CustomerRentalActivitySection({
  customerId,
}: CustomerRentalActivitySectionProps) {
  const ordersQuery = useRentalOrders({
    customerId,
    page: 1,
    pageSize: 5,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.meta.total ?? orders.length;

  return (
    <SectionCard
      title="Rental activity"
      description="Recent rental orders for this customer."
      actions={
        total > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={<Link href={`${ROUTES.rentalOrders}?customerId=${customerId}`} />}
          >
            View all
          </AppButton>
        ) : null
      }
    >
      {ordersQuery.isLoading ? (
        <LoadingState label="Loading rental orders..." />
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rental orders for this customer yet.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={ROUTES.rentalOrderDetail(order.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <RentalOrderStatusBadge status={order.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.startDate)} → {formatDate(order.endDate)}
                </p>
              </div>
              <AppButton
                variant="outline"
                size="sm"
                leftIcon={<ClipboardListIcon className="size-3.5" aria-hidden="true" />}
                render={<Link href={ROUTES.rentalOrderDetail(order.id)} />}
              >
                Open
              </AppButton>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
