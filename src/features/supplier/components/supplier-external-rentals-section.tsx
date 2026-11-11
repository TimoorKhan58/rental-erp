"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import {
  useExternalRentalPermissions,
  useExternalRentals,
} from "@/features/external-rental/hooks";
import { formatCurrency, formatDate } from "@/lib/utils";

type SupplierExternalRentalsSectionProps = {
  supplierId: string;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  ALLOCATED: "Allocated",
  IN_USE: "In use",
  RETURN_PENDING: "Return pending",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

export function SupplierExternalRentalsSection({
  supplierId,
}: SupplierExternalRentalsSectionProps) {
  const { canRead } = useExternalRentalPermissions();
  const { data, isLoading } = useExternalRentals({
    supplierId,
    pageSize: 5,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const agreements = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;

  return (
    <SectionCard
      title="External rentals"
      description="Hire-in agreements sourced from this supplier."
      actions={
        totalCount > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link href={`${ROUTES.externalRentals}?supplierId=${supplierId}`} />
            }
          >
            View all
          </AppButton>
        ) : null
      }
    >
      {isLoading ? (
        <LoadingState label="Loading external rentals..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No external rental agreements linked to this supplier yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium" scope="col">
                  Agreement
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Hire period
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Status
                </th>
                <th className="px-3 py-2 font-medium text-right" scope="col">
                  Outstanding
                </th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((agreement) => (
                <tr key={agreement.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <Link
                      href={ROUTES.externalRentalDetail(agreement.id)}
                      className="font-medium text-primary hover:underline"
                    >
                      {agreement.agreementNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(agreement.hireStartDate)} –{" "}
                    {formatDate(agreement.hireEndDate)}
                  </td>
                  <td className="px-3 py-2">
                    {STATUS_LABELS[agreement.status] ?? agreement.status}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(agreement.outstandingBalance ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
