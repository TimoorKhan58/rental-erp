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
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import {
  buildWorkflowDetailBreadcrumbs,
  rentalOrderBackHref,
  rentalOrderBackLabel,
  resolveRentalWorkflowParent,
} from "@/features/rental-order/navigation/rental-workflow-breadcrumbs";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import { usePaymentPermissions } from "@/features/payment/hooks";
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
import { RentalInvoiceJournalSection } from "../components/rental-invoice-journal-section";
import { RentalInvoicePaymentsSection } from "../components/rental-invoice-payments-section";
import { RentalInvoicePaymentProgressBar } from "../components/rental-invoice-payment-progress-bar";
import { RentalInvoiceStatusBadge } from "../components/rental-invoice-status-badge";
import { RentalInvoiceStatusTimeline } from "../components/rental-invoice-status-timeline";
import { RentalInvoiceWorkflowProgressBar } from "../components/rental-invoice-workflow-progress-bar";
import { ConfirmModal } from "@/components/design-system/modal";
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
    <div className="rounded-md border border-border bg-muted/20 p-3.5">
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
  const { canCreate: canCreatePayment } = usePaymentPermissions();
  const { rentalOrderLabelById } = useRentalInvoiceFilterOptions();
  const { data: customer } = useCustomer(invoice?.customerId ?? "");
  const convertMissingToLoss = useConvertMissingToLoss();

  const [issueOpen, setIssueOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [convertMissingOpen, setConvertMissingOpen] = useState(false);

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
  const rentalParent = resolveRentalWorkflowParent({
    rentalOrderId: invoice.rentalOrderId,
    rentalOrderNumber: rentalOrderLabel,
  });
  const rentalBackHref = rentalOrderBackHref(rentalParent);
  const canRecordPayment =
    canCreatePayment &&
    invoice.status !== "VOID" &&
    invoice.status !== "DRAFT" &&
    invoice.balance > 0;

  return (
    <PageContainer className="space-y-5 print:space-y-4">
      <div className="print:hidden">
      <PageHeader
        title={invoice.invoiceNumber}
        description={customer?.name ?? invoice.customerId}
        breadcrumbs={buildWorkflowDetailBreadcrumbs({
          rentalParent,
          module: { label: "Rental Invoices", href: ROUTES.rentalInvoices },
          currentLabel: invoice.invoiceNumber,
        })}
        actions={
          <>
            {rentalBackHref && rentalParent ? (
              <AppButton
                leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
                render={<Link href={rentalBackHref} />}
              >
                {rentalOrderBackLabel(rentalParent)}
              </AppButton>
            ) : null}
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalInvoices} />}
            >
              All invoices
            </AppButton>
            <AppButton
              variant="outline"
              leftIcon={<PrinterIcon className="size-4" aria-hidden="true" />}
              onClick={() => setPrintPreviewOpen(true)}
            >
              Print preview
            </AppButton>
            {canRecordPayment ? (
              <AppButton
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                leftIcon={<WalletIcon className="size-4" aria-hidden="true" />}
                render={
                  <Link
                    href={ROUTES.paymentNewForInvoice(invoice.id, invoice.customerId)}
                  />
                }
              >
                Record payment
              </AppButton>
            ) : null}
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
                onClick={() => setConvertMissingOpen(true)}
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

      <section
        className="space-y-5 rounded-md border border-border bg-card p-4 sm:p-5 print:hidden"
        aria-label="Invoice financial overview"
      >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Invoice
                  </p>
                  <RentalInvoiceStatusBadge status={invoice.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Collection
                  </p>
                  <PaymentStatusBadge
                    status={invoice.status}
                    balance={invoice.balance}
                    paidAmount={invoice.paidAmount}
                  />
                </div>
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
      </section>

      <div className="app-grid print:hidden">
        <div className="min-w-0 space-y-5 sm:col-span-6 lg:col-span-8">
          <SectionCard
            title="Charges"
            description="Line amounts are authoritative invoice values — totals are not recalculated in the UI."
          >
            <RentalInvoiceLineItemsTable
              items={invoice.items}
              subtotal={invoice.subtotal}
              discount={invoice.discount}
              tax={invoice.tax}
              grandTotal={invoice.grandTotal}
            />
          </SectionCard>

          <SectionCard title="Payment state">
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              <DetailField label="Discount" value={formatCurrency(invoice.discount)} />
              <DetailField label="Tax" value={formatCurrency(invoice.tax)} />
              <DetailField label="Grand total" value={formatCurrency(invoice.grandTotal)} />
              <DetailField label="Paid amount" value={formatCurrency(invoice.paidAmount)} />
              <DetailField label="Outstanding balance" value={formatCurrency(invoice.balance)} />
            </dl>
            {canVoid && canVoidRentalInvoice(invoice.status) ? (
              <p className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Void is blocked when POSTED payments exist for this invoice. The void dialog
                checks linked payments; the server remains authoritative.
              </p>
            ) : null}
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

          <RentalInvoicePaymentsSection invoice={invoice} />
        </div>

        <div className="min-w-0 space-y-6 sm:col-span-6 lg:col-span-4">
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

          <RentalInvoiceJournalSection invoiceId={invoice.id} />
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

      <ConfirmModal
        open={convertMissingOpen}
        onOpenChange={setConvertMissingOpen}
        title="Convert missing to loss"
        description="Charge missing items at replacement / actual price on this draft invoice? The server remains authoritative for the resulting loss lines."
        confirmLabel="Convert to loss"
        onConfirm={() => {
          void convertMissingToLoss.mutateAsync(invoice.id).then(() => {
            setConvertMissingOpen(false);
          });
        }}
        isLoading={convertMissingToLoss.isPending}
      />
    </PageContainer>
  );
}
