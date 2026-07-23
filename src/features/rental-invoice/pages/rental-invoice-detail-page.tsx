"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  ClipboardListIcon,
  ClockIcon,
  FileCheckIcon,
  PencilIcon,
  PrinterIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import {
  canIssueRentalInvoice,
  canVoidRentalInvoice,
  getRentalInvoiceLineItemCount,
  getRentalInvoicePaymentProgress,
} from "../mappers";
import {
  useConvertMissingToLoss,
  useRentalInvoice,
  useRentalInvoiceFilterOptions,
  useRentalInvoicePermissions,
} from "../hooks";
import { PaymentStatusBadge } from "../components/payment-status-badge";
import { RentalInvoiceLineItemsTable } from "../components/rental-invoice-line-items-table";
import { RentalInvoicePaymentProgressBar } from "../components/rental-invoice-payment-progress-bar";
import { RentalInvoiceStatusBadge } from "../components/rental-invoice-status-badge";
import { RentalInvoiceStatusTimeline } from "../components/rental-invoice-status-timeline";
import { RentalInvoiceWorkflowProgressBar } from "../components/rental-invoice-workflow-progress-bar";
import { EditInvoiceAdditionalChargesDialog } from "../dialogs/edit-invoice-additional-charges-dialog";
import { IssueRentalInvoiceDialog } from "../dialogs/issue-rental-invoice-dialog";
import { VoidRentalInvoiceDialog } from "../dialogs/void-rental-invoice-dialog";
import { RentalInvoicePrintPreviewDialog } from "../dialogs/rental-invoice-print-preview-dialog";

type RentalInvoiceDetailPageProps = {
  invoiceId: string;
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

function RelatedEntityCard({
  title,
  icon,
  iconClass,
  fields,
  href,
  linkLabel,
}: {
  title: string;
  icon: React.ReactNode;
  iconClass: string;
  fields: Array<{ label: string; value: string | null | undefined }>;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              iconClass,
            )}
          >
            {icon}
          </div>
          <dl className="grid flex-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <DetailField key={field.label} label={field.label} value={field.value} />
            ))}
          </dl>
        </div>
        {href && linkLabel ? (
          <AppButton
            variant="outline"
            size="sm"
            rightIcon={<ArrowUpRightIcon className="size-3.5" aria-hidden="true" />}
            render={<Link href={href} />}
          >
            {linkLabel}
          </AppButton>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function RentalInvoiceDetailPage({ invoiceId }: RentalInvoiceDetailPageProps) {
  const router = useRouter();
  const { data: invoice, isLoading, isError, error, refetch } = useRentalInvoice(invoiceId);
  const { canIssue, canVoid, canUpdate } = useRentalInvoicePermissions();
  const { rentalOrderLabelById } = useRentalInvoiceFilterOptions();
  const { data: customer } = useCustomer(invoice?.customerId ?? "");
  const convertMissingToLoss = useConvertMissingToLoss();

  const [issueOpen, setIssueOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(false);

  const metrics = useMemo(() => {
    if (!invoice) {
      return null;
    }

    return {
      lineItemCount: getRentalInvoiceLineItemCount(invoice),
      paymentProgress: getRentalInvoicePaymentProgress(invoice),
      hasMissing: invoice.items.some((item) => item.missingQuantity > 0),
    };
  }, [invoice]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading invoice details..." />
      </PageContainer>
    );
  }

  if (isError || !invoice || !metrics) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Invoice not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested invoice could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.rentalInvoices} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const rentalOrderLabel = rentalOrderLabelById.get(invoice.rentalOrderId);

  return (
    <PageContainer className="space-y-6 print:space-y-4">
      <div className="print:hidden">
      <PageHeader
        title={invoice.invoiceNumber}
        description={customer?.name ?? invoice.customerId}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental invoices", href: ROUTES.rentalInvoices },
          { label: invoice.invoiceNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalInvoices} />}
            >
              Back
            </AppButton>
            <AppButton
              variant="outline"
              leftIcon={<PrinterIcon className="size-4" aria-hidden="true" />}
              onClick={() => setPrintPreviewOpen(true)}
            >
              Print preview
            </AppButton>
            {canUpdate && invoice.status === "DRAFT" ? (
              <AppButton
                variant="outline"
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                onClick={() => setChargesOpen(true)}
              >
                Additional charges
              </AppButton>
            ) : null}
            {canUpdate && invoice.status === "DRAFT" && metrics.hasMissing ? (
              <AppButton
                variant="outline"
                leftIcon={<ClipboardListIcon className="size-4" aria-hidden="true" />}
                loading={convertMissingToLoss.isPending}
                onClick={() => void convertMissingToLoss.mutateAsync(invoice.id)}
              >
                Convert missing to loss
              </AppButton>
            ) : null}
            {canIssue && canIssueRentalInvoice(invoice.status) ? (
              <AppButton
                leftIcon={<FileCheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setIssueOpen(true)}
              >
                Issue
              </AppButton>
            ) : null}
            {canVoid && canVoidRentalInvoice(invoice.status) ? (
              <AppButton
                variant="destructive"
                leftIcon={<XIcon className="size-4" aria-hidden="true" />}
                onClick={() => setVoidOpen(true)}
              >
                Void
              </AppButton>
            ) : null}
          </>
        }
      />
      </div>

      <Card className="overflow-hidden border-border/60 shadow-soft print:hidden">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <RentalInvoiceStatusBadge status={invoice.status} />
                <PaymentStatusBadge
                  status={invoice.status}
                  balance={invoice.balance}
                  paidAmount={invoice.paidAmount}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Invoiced {formatDate(invoice.invoiceDate)}
                {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""} · Last updated{" "}
                {formatDateTime(invoice.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Grand total
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(invoice.grandTotal)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Paid"
              value={formatCurrency(invoice.paidAmount)}
              hint={`${metrics.paymentProgress}% collected`}
              icon={<WalletIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Outstanding"
              value={formatCurrency(invoice.balance)}
              hint="Remaining balance"
              icon={<ReceiptIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Due date"
              value={invoice.dueDate ? formatDate(invoice.dueDate) : "Not set"}
              hint="Payment due date"
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Line items"
              value={metrics.lineItemCount.toLocaleString()}
              hint="Charges, discounts, and taxes"
              icon={<ClipboardListIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
          </div>

          {invoice.status !== "VOID" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Invoice workflow</span>
                  <span className="text-muted-foreground">Draft → Issued → Paid</span>
                </div>
                <RentalInvoiceWorkflowProgressBar status={invoice.status} size="md" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Payment collection</span>
                  <span className="text-muted-foreground tabular-nums">
                    {metrics.paymentProgress}%
                  </span>
                </div>
                <RentalInvoicePaymentProgressBar invoice={invoice} size="md" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 print:hidden">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Customer bill">
            <RentalInvoiceLineItemsTable
              items={invoice.items}
              subtotal={invoice.subtotal}
              discount={invoice.discount}
              tax={invoice.tax}
              grandTotal={invoice.grandTotal}
            />
          </SectionCard>

          <SectionCard title="Payment summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              <DetailField label="Discount" value={formatCurrency(invoice.discount)} />
              <DetailField label="Tax" value={formatCurrency(invoice.tax)} />
              <DetailField label="Grand total" value={formatCurrency(invoice.grandTotal)} />
              <DetailField label="Paid amount" value={formatCurrency(invoice.paidAmount)} />
              <DetailField label="Outstanding balance" value={formatCurrency(invoice.balance)} />
            </dl>
          </SectionCard>

          {invoice.notes ? (
            <SectionCard title="Notes">
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </SectionCard>
          ) : null}

          <RelatedEntityCard
            title="Customer"
            icon={<UsersIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-primary/12 text-primary"
            fields={[
              { label: "Name", value: customer?.name },
              { label: "Customer code", value: customer?.customerCode },
              { label: "Phone", value: customer?.phone },
            ]}
            href={customer ? ROUTES.customerDetail(customer.id) : undefined}
            linkLabel="View customer"
          />

          <RelatedEntityCard
            title="Rental order"
            icon={<ClipboardListIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-info/12 text-info"
            fields={[{ label: "Order number", value: rentalOrderLabel }]}
            href={ROUTES.rentalOrderDetail(invoice.rentalOrderId)}
            linkLabel="View rental order"
          />

          <EmptyCard
            title="Payment history"
            description="Payment records will appear here when the payments module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Invoice workflow"
            actions={<RentalInvoiceStatusBadge status={invoice.status} />}
          >
            <RentalInvoiceStatusTimeline status={invoice.status} />
          </SectionCard>

          <SectionCard title="Milestones">
            <dl className="space-y-4">
              <DetailField
                label="Issued at"
                value={invoice.issuedAt ? formatDateTime(invoice.issuedAt) : null}
              />
              <DetailField
                label="Voided at"
                value={invoice.voidedAt ? formatDateTime(invoice.voidedAt) : null}
              />
            </dl>
          </SectionCard>

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(invoice.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(invoice.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <EmptyCard
            title="Accounting journal"
            description="Accounting entries will appear here when accounting integration is connected."
          />
        </div>
      </div>

      <IssueRentalInvoiceDialog
        invoice={invoice}
        open={issueOpen}
        onOpenChange={setIssueOpen}
      />

      <VoidRentalInvoiceDialog
        invoice={invoice}
        open={voidOpen}
        onOpenChange={setVoidOpen}
        onVoided={() => router.push(ROUTES.rentalInvoices)}
      />

      <RentalInvoicePrintPreviewDialog
        invoice={invoice}
        customer={customer}
        orderNumber={rentalOrderLabel}
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
      />

      <EditInvoiceAdditionalChargesDialog
        invoice={invoice}
        open={chargesOpen}
        onOpenChange={setChargesOpen}
      />
    </PageContainer>
  );
}
