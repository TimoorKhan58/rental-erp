"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  canEditPayment,
  canPostPayment,
  canVoidPayment,
  METHOD_LABELS,
} from "../mappers";
import { PaymentRecordStatusBadge } from "../components/payment-status-badge";
import { PaymentWorkflowProgressBar } from "../components/payment-workflow-progress-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ListPaymentsParams, PaymentResponse, PaymentSortField } from "../types";

type PaymentTableColumnOptions = {
  params: ListPaymentsParams;
  onSort: (field: PaymentSortField, order: ListPaymentsParams["sortOrder"]) => void;
  customerLabelById: Map<string, string>;
  invoiceLabelById: Map<string, string>;
  canUpdate: boolean;
  canPost: boolean;
  canVoid: boolean;
  onPost: (payment: PaymentResponse) => void;
  onVoid: (payment: PaymentResponse) => void;
};

export function getPaymentTableColumns({
  params,
  onSort,
  customerLabelById,
  invoiceLabelById,
  canUpdate,
  canPost,
  canVoid,
  onPost,
  onVoid,
}: PaymentTableColumnOptions): Array<DataTableColumn<PaymentResponse>> {
  return [
    {
      id: "paymentNumber",
      header: (
        <SortableColumnHeader
          label="Payment"
          field="paymentNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.paymentDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.paymentNumber}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {customerLabelById.get(row.customerId) ?? row.customerId}
          </span>
        </Link>
      ),
    },
    {
      id: "invoice",
      header: "Invoice",
      cell: (row) => (
        <span className="text-sm">
          {invoiceLabelById.get(row.rentalInvoiceId) ?? row.rentalInvoiceId}
        </span>
      ),
    },
    {
      id: "workflow",
      header: "Progress",
      cell: (row) => (
        <div className="min-w-[8rem] space-y-1.5">
          <PaymentRecordStatusBadge status={row.status} />
          <PaymentWorkflowProgressBar status={row.status} />
        </div>
      ),
    },
    {
      id: "paymentDate",
      header: (
        <SortableColumnHeader
          label="Payment date"
          field="paymentDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-[6rem] text-sm">
          <p className="font-medium">{formatDate(row.paymentDate)}</p>
          <p className="text-xs text-muted-foreground">{METHOD_LABELS[row.paymentMethod]}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: (
        <SortableColumnHeader
          label="Amount"
          field="amount"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      id: "referenceNumber",
      header: "Reference",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.referenceNumber ?? "—"}</span>
      ),
    },
    {
      id: "createdAt",
      header: (
        <SortableColumnHeader
          label="Created"
          field="createdAt"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => {
        const showEdit = canUpdate && canEditPayment(row.status);
        const showPost = canPost && canPostPayment(row.status);
        const showVoid = canVoid && canVoidPayment(row.status);
        const hasActions = showEdit || showPost || showVoid;

        if (!hasActions) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${row.paymentNumber}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={ROUTES.paymentDetail(row.id)} />}>
                View details
              </DropdownMenuItem>
              {showEdit ? (
                <DropdownMenuItem render={<Link href={ROUTES.paymentEdit(row.id)} />}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {showPost ? (
                <DropdownMenuItem onClick={() => onPost(row)}>Post payment</DropdownMenuItem>
              ) : null}
              {showVoid ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onVoid(row)}>
                    Void payment
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      className: "w-12 text-right",
      headerClassName: "w-12",
    },
  ];
}
