"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  TYPE_LABELS,
  canApproveExpense,
  canEditExpense,
  canPayExpense,
  canRejectExpense,
  canSubmitExpense,
} from "../mappers";
import { ExpenseStatusBadge } from "./expense-status-badge";
import type { ExpenseResponse } from "../types";

type ExpenseMobileListProps = {
  rows: ExpenseResponse[];
  resolveCategoryLabel: (categoryId: string) => string;
  resolveVendorLabel: (expense: ExpenseResponse) => string;
  canUpdate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canPay: boolean;
  onSubmit: (expense: ExpenseResponse) => void;
  onApprove: (expense: ExpenseResponse) => void;
  onReject: (expense: ExpenseResponse) => void;
  onPay: (expense: ExpenseResponse) => void;
};

export function ExpenseMobileList({
  rows,
  resolveCategoryLabel,
  resolveVendorLabel,
  canUpdate,
  canApprove,
  canReject,
  canPay,
  onSubmit,
  onApprove,
  onReject,
  onPay,
}: ExpenseMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Expense list">
      {rows.map((row) => {
        const showEdit = canUpdate && canEditExpense(row.status);
        const showSubmit = canUpdate && canSubmitExpense(row.status);
        const showApprove = canApprove && canApproveExpense(row.status);
        const showReject = canReject && canRejectExpense(row.status);
        const showPay = canPay && canPayExpense(row.status);
        const needsAction =
          row.status === "DRAFT" ||
          row.status === "SUBMITTED" ||
          row.status === "APPROVED";

        return (
          <li
            key={row.id}
            className={cn(
              "rounded-md border border-border bg-card px-3 py-3",
              row.status === "REJECTED" && "border-l-[3px] border-l-destructive/50",
              row.status === "PAID" && "border-l-[3px] border-l-success/50",
              needsAction && "border-l-[3px] border-l-warning",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <Link
                  href={ROUTES.expenseDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {row.expenseNumber}
                </Link>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {row.description}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveVendorLabel(row)} · {resolveCategoryLabel(row.categoryId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(row.expenseDate)} · {TYPE_LABELS[row.expenseType]}
                </p>
                <p className="tabular-nums text-sm font-medium">
                  {formatCurrency(row.amount)}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <ExpenseStatusBadge status={row.status} />
                </div>
              </div>

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
                  <MoreHorizontalIcon className="size-4" aria-hidden="true" />
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
