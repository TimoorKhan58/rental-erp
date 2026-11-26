"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const supplierId = searchParams.get("supplierId") ?? undefined;
  const { canCreate } = useExternalRentalPermissions();
  const { supplierLabelById, rentalOrderLabelById } =
    useExternalRentalFilterOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const params = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search || undefined,
      supplierId,
    }),
    [page, search, supplierId],
  );
  const { data, isLoading, isError, error, refetch, isFetching } =
    useExternalRentals(params);

  return (
    <PageContainer>
      <PageHeader
        title="Hire-ins"
        description="Items you hire from other suppliers when you do not have enough of your own."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Hire-ins" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.externalRentalsNew} />}
            >
              New hire-in
            </AppButton>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by hire-in number..."
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
        <LoadingState label="Loading hire-ins..." />
      ) : isError ? (
        <EmptyState
          title="Could not load hire-ins"
          description={error?.message ?? "Please try again."}
        />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No hire-ins yet"
          description="Hire items from a supplier when your own stock is not enough."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Hire-in</th>
                  <th className="px-3 py-2 font-medium">For order</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Hire period</th>
                  <th className="px-3 py-2 font-medium text-right">Cost</th>
                  <th className="px-3 py-2 font-medium text-right">Paid</th>
                  <th className="px-3 py-2 font-medium text-right">Still owed</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row: ExternalRentalResponse) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      {/* The supplier comes first, like customers elsewhere. */}
                      <Link href={ROUTES.externalRentalDetail(row.id)} className="group block">
                        <span className="block font-medium text-foreground group-hover:text-primary group-hover:underline">
                          {nameOnly(supplierLabelById.get(row.supplierId) ?? row.supplierId)}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{row.agreementNumber}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {/* Was the raw internal id; the order number is what people know. */}
                      <Link
                        href={ROUTES.rentalOrderDetail(row.rentalOrderId)}
                        className="text-primary hover:underline"
                      >
                        {rentalOrderLabelById.get(row.rentalOrderId)?.replace(/ — .*$/, "") ?? "View order"}
                      </Link>
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
                      {row.status !== "CANCELLED" && row.outstandingBalance > 0 ? (
                        <span className="font-medium tabular-nums text-warning-foreground">
                          {formatCurrency(row.outstandingBalance)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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

/** "SUP-00003 — zeeshan" → "zeeshan". */
function nameOnly(label: string): string {
  const separator = " — ";
  return label.includes(separator) ? label.split(separator).slice(1).join(separator) : label;
}
