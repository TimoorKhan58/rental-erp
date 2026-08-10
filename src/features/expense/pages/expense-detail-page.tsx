"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  FileCheckIcon,
  HashIcon,
  PencilIcon,
  SendIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  METHOD_LABELS,
  TYPE_LABELS,
  canApproveExpense,
  canEditExpense,
  canPayExpense,
  canRejectExpense,
  canSubmitExpense,
} from "../mappers";
import {
  useExpense,
  useExpenseFilterOptions,
  useExpensePermissions,
} from "../hooks";
import {
  ExpenseStatusBadge,
  ExpenseStatusTimeline,
  ExpenseWorkflowProgressBar,
} from "../components";
import {
  ApproveExpenseDialog,
  PayExpenseDialog,
  RejectExpenseDialog,
  SubmitExpenseDialog,
} from "../dialogs";

type ExpenseDetailPageProps = {
  expenseId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{display}</dd>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ExpenseDetailPage({ expenseId }: ExpenseDetailPageProps) {
  const { data: expense, isLoading, isError, error, refetch } = useExpense(expenseId);
  const { canUpdate, canApprove, canReject, canPay } = useExpensePermissions();
  const { categoryLabelById, supplierLabelById } = useExpenseFilterOptions();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const labels = useMemo(() => {
    if (!expense) {
      return null;
    }

    return {
      categoryLabel: categoryLabelById.get(expense.categoryId) ?? expense.categoryId,
      vendorLabel:
        expense.expenseType === "VENDOR"
          ? (supplierLabelById.get(expense.supplierId ?? "") ??
            expense.supplierId ??
            "—")
          : (expense.vendorName ?? "—"),
    };
  }, [expense, categoryLabelById, supplierLabelById]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading expense details..." />
      </PageContainer>
    );
  }

  if (isError || !expense || !labels) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Expense not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested expense could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.expenses} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={expense.expenseNumber}
        description={`${TYPE_LABELS[expense.expenseType]} · ${labels.categoryLabel}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Expenses", href: ROUTES.expenses },
          { label: expense.expenseNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.expenses} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditExpense(expense.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.expenseEdit(expense.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canUpdate && canSubmitExpense(expense.status) ? (
              <AppButton
                leftIcon={<SendIcon className="size-4" aria-hidden="true" />}
                onClick={() => setSubmitOpen(true)}
              >
                Submit
              </AppButton>
            ) : null}
            {canApprove && canApproveExpense(expense.status) ? (
              <AppButton
                leftIcon={<FileCheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setApproveOpen(true)}
              >
                Approve
              </AppButton>
            ) : null}
            {canPay && canPayExpense(expense.status) ? (
              <AppButton
                leftIcon={<CheckCircle2Icon className="size-4" aria-hidden="true" />}
                onClick={() => setPayOpen(true)}
              >
                Mark paid
              </AppButton>
            ) : null}
            {canReject && canRejectExpense(expense.status) ? (
              <AppButton
                variant="destructive"
                leftIcon={<XIcon className="size-4" aria-hidden="true" />}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </AppButton>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden border-border/60 shadow-soft">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <ExpenseStatusBadge status={expense.status} />
              <p className="text-sm text-muted-foreground">
                Dated {formatDate(expense.expenseDate)} · Last updated{" "}
                {formatDateTime(expense.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Expense amount
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(expense.amount)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Expense date"
              value={formatDate(expense.expenseDate)}
              hint="Date expense was incurred"
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Category"
              value={labels.categoryLabel}
              hint="Expense classification"
              icon={<TagIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Method"
              value={
                expense.paymentMethod
                  ? METHOD_LABELS[expense.paymentMethod]
                  : "—"
              }
              hint="Payment channel"
              icon={<CreditCardIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Reference"
              value={expense.referenceNumber ?? "—"}
              hint="External reference"
              icon={<HashIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
          </div>

          {expense.status !== "REJECTED" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Expense workflow</span>
                <span className="text-muted-foreground">
                  Draft → Submitted → Approved → Paid
                </span>
              </div>
              <ExpenseWorkflowProgressBar status={expense.status} size="md" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Expense details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Description" value={expense.description} />
              <DetailField label="Type" value={TYPE_LABELS[expense.expenseType]} />
              <DetailField label="Vendor / supplier" value={labels.vendorLabel} />
              <DetailField label="Category" value={labels.categoryLabel} />
              <DetailField
                label="Payment method"
                value={
                  expense.paymentMethod
                    ? METHOD_LABELS[expense.paymentMethod]
                    : null
                }
              />
              <DetailField label="Reference" value={expense.referenceNumber} />
            </dl>
          </SectionCard>

          {expense.notes ? (
            <SectionCard title="Notes">
              <p className="text-sm text-muted-foreground">{expense.notes}</p>
            </SectionCard>
          ) : null}

          {expense.rejectionReason ? (
            <SectionCard title="Rejection reason">
              <p className="text-sm text-destructive">{expense.rejectionReason}</p>
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Expense workflow"
            actions={<ExpenseStatusBadge status={expense.status} />}
          >
            <ExpenseStatusTimeline status={expense.status} />
          </SectionCard>

          <SectionCard title="Milestones">
            <dl className="space-y-4">
              <DetailField
                label="Submitted at"
                value={expense.submittedAt ? formatDateTime(expense.submittedAt) : null}
              />
              <DetailField
                label="Approved at"
                value={expense.approvedAt ? formatDateTime(expense.approvedAt) : null}
              />
              <DetailField
                label="Rejected at"
                value={expense.rejectedAt ? formatDateTime(expense.rejectedAt) : null}
              />
              <DetailField
                label="Paid at"
                value={expense.paidAt ? formatDateTime(expense.paidAt) : null}
              />
              <DetailField label="Journal entry" value={expense.journalEntryId} />
            </dl>
          </SectionCard>

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(expense.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(expense.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SubmitExpenseDialog
        expense={expense}
        open={submitOpen}
        onOpenChange={setSubmitOpen}
      />
      <ApproveExpenseDialog
        expense={expense}
        open={approveOpen}
        onOpenChange={setApproveOpen}
      />
      <RejectExpenseDialog
        expense={expense}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
      <PayExpenseDialog expense={expense} open={payOpen} onOpenChange={setPayOpen} />
    </PageContainer>
  );
}
