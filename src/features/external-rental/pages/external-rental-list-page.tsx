"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { EmptyState, LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useExternalRentalFilterOptions,
  useExternalRentalPermissions,
  useExternalRentals,
} from "../hooks";
import {
  ExternalRentalSettlementBadge,
  ExternalRentalStatusBadge,
} from "../components/external-rental-status-badge";
import type { ExternalRentalResponse } from "../types";

export function ExternalRentalListPage() {
  const { canCreate } = useExternalRentalPermissions();
  const { supplierLabelById, warehouseLabelById } =
    useExternalRentalFilterOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const params = useMemo(
    () => ({ page, pageSize: 20, search: search || undefined }),
    [page, search],
  );
  const { data, isLoading, isError, error, refetch, isFetching } =
    useExternalRentals(params);

  return (
    <PageContainer>
      <PageHeader
        title="External Rentals"
        description="Hire-in agreements for shortfall sourcing from suppliers."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "External Rentals" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.externalRentalsNew} />}
            >
              New agreement
            </AppButton>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search agreement number..."
          className="max-w-sm"
        />
        <AppButton
          variant="outline"
          leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          Refresh
        </AppButton>
      </div>

      {isLoading ? (
        <LoadingState label="Loading external rentals..." />
      ) : isError ? (
        <EmptyState
          title="Unable to load agreements"
          description={error?.message ?? "Please try again."}
        />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No external rentals"
          description="Create an agreement to hire inventory from a supplier."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Agreement</th>
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="px-3 py-2 font-medium">Rental order</th>
                  <th className="px-3 py-2 font-medium">Warehouse</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Settlement</th>
                  <th className="px-3 py-2 font-medium">Hire period</th>
                  <th className="px-3 py-2 font-medium text-right">Due</th>
                  <th className="px-3 py-2 font-medium text-right">Paid</th>
                  <th className="px-3 py-2 font-medium text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row: ExternalRentalResponse) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <Link
                        href={ROUTES.externalRentalDetail(row.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.agreementNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {supplierLabelById.get(row.supplierId) ?? row.supplierId}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.rentalOrderId}
                    </td>
                    <td className="px-3 py-2">
                      {warehouseLabelById.get(row.warehouseId) ??
                        row.warehouseId}
                    </td>
                    <td className="px-3 py-2">
                      <ExternalRentalStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      <ExternalRentalSettlementBadge
                        status={row.settlementStatus}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(row.hireStartDate)} –{" "}
                      {formatDate(row.hireEndDate)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(row.amountDue)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(row.amountPaid)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(row.outstandingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataPagination
            meta={
              data?.meta ?? {
                page,
                pageSize: 20,
                total: 0,
                totalPages: 1,
              }
            }
            onPageChange={setPage}
          />
        </>
      )}
    </PageContainer>
  );
}
