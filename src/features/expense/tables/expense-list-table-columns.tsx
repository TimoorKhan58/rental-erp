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
  METHOD_LABELS,
  TYPE_LABELS,
  canApproveExpense,
  canEditExpense,
  canPayExpense,
  canRejectExpense,
  canSubmitExpense,
} from "../mappers";
import { ExpenseStatusBadge } from "../components/expense-status-badge";
import { ExpenseWorkflowProgressBar } from "../components/expense-workflow-progress-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ExpenseResponse, ExpenseSortField, ListExpensesParams } from "../types";

type ExpenseTableColumnOptions = {
  params: ListExpensesParams;
  onSort: (field: ExpenseSortField, order: ListExpensesParams["sortOrder"]) => void;
  categoryLabelById: Map<string, string>;
  supplierLabelById: Map<string, string>;
  canUpdate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canPay: boolean;
  onSubmit: (expense: ExpenseResponse) => void;
  onApprove: (expense: ExpenseResponse) => void;
  onReject: (expense: ExpenseResponse) => void;
  onPay: (expense: ExpenseResponse) => void;
};

export function getExpenseTableColumns({
  params,
  onSort,
  categoryLabelById,
  supplierLabelById,
  canUpdate,
  canApprove,
  canReject,
  canPay,
  onSubmit,
  onApprove,
  onReject,
  onPay,
}: ExpenseTableColumnOptions): Array<DataTableColumn<ExpenseResponse>> {
  return [
    {
      id: "expenseNumber",
      header: (
        <SortableColumnHeader
          label="Expense"
          field="expenseNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.expenseDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.expenseNumber}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
            {row.description}
          </span>
        </Link>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => (
        <span className="text-sm">
          {categoryLabelById.get(row.categoryId) ?? row.categoryId}
        </span>
      ),
    },
    {
      id: "workflow",
      header: "Progress",
      cell: (row) => (
        <div className="min-w-[8rem] space-y-1.5">
          <ExpenseStatusBadge status={row.status} />
          <ExpenseWorkflowProgressBar status={row.status} />
        </div>
      ),
    },
    {
      id: "expenseDate",
      header: (
        <SortableColumnHeader
          label="Date"
          field="expenseDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-[6rem] text-sm">
          <p className="font-medium">{formatDate(row.expenseDate)}</p>
          <p className="text-xs text-muted-foreground">{TYPE_LABELS[row.expenseType]}</p>
        </div>
      ),
    },
    {
      id: "vendor",
      header: "Vendor",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.expenseType === "VENDOR"
            ? (supplierLabelById.get(row.supplierId ?? "") ?? row.supplierId ?? "—")
            : (row.vendorName ?? "—")}
        </span>
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
        <div className="text-right">
          <span className="font-medium tabular-nums">{formatCurrency(row.amount)}</span>
          {row.paymentMethod ? (
            <p className="text-xs text-muted-foreground">
              {METHOD_LABELS[row.paymentMethod]}
            </p>
          ) : null}
        </div>
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
        const showEdit = canUpdate && canEditExpense(row.status);
        const showSubmit = canUpdate && canSubmitExpense(row.status);
        const showApprove = canApprove && canApproveExpense(row.status);
        const showReject = canReject && canRejectExpense(row.status);
        const showPay = canPay && canPayExpense(row.status);
        const hasActions =
          showEdit || showSubmit || showApprove || showReject || showPay;

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
                  aria-label={`Actions for ${row.expenseNumber}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={ROUTES.expenseDetail(row.id)} />}>
                View details
              </DropdownMenuItem>
              {showEdit ? (
                <DropdownMenuItem render={<Link href={ROUTES.expenseEdit(row.id)} />}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {showSubmit ? (
                <DropdownMenuItem onClick={() => onSubmit(row)}>Submit</DropdownMenuItem>
              ) : null}
              {showApprove ? (
                <DropdownMenuItem onClick={() => onApprove(row)}>Approve</DropdownMenuItem>
              ) : null}
              {showPay ? (
                <DropdownMenuItem onClick={() => onPay(row)}>Mark paid</DropdownMenuItem>
              ) : null}
              {showReject ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onReject(row)}>
                    Reject
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
