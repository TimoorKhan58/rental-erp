"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, FileCheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard, MetricCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import {
  canIssueRentalInvoice,
  canVoidRentalInvoice,
  groupLineItemsByCategory,
  LINE_TYPE_LABELS,
} from "../mappers";
import {
  useRentalInvoice,
  useRentalInvoiceFilterOptions,
  useRentalInvoicePermissions,
} from "../hooks";
import { RentalInvoiceStatusBadge } from "../components/rental-invoice-status-badge";
import { PaymentStatusBadge } from "../components/payment-status-badge";
import { RentalInvoiceStatusTimeline } from "../components/rental-invoice-status-timeline";
import { IssueRentalInvoiceDialog } from "../dialogs/issue-rental-invoice-dialog";
import { VoidRentalInvoiceDialog } from "../dialogs/void-rental-invoice-dialog";

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

export function RentalInvoiceDetailPage({ invoiceId }: RentalInvoiceDetailPageProps) {
  const router = useRouter();
  const { data: invoice, isLoading, isError, error, refetch } = useRentalInvoice(invoiceId);
  const { canIssue, canVoid } = useRentalInvoicePermissions();
  const { rentalOrderLabelById } = useRentalInvoiceFilterOptions();
  const { data: customer } = useCustomer(invoice?.customerId ?? "");

  const [issueOpen, setIssueOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading invoice details..." />
      </PageContainer>
    );
  }

  if (isError || !invoice) {
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

  const { charges, discounts, taxes } = groupLineItemsByCategory(invoice.items);
  const sortedItems = [...invoice.items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <PageContainer>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Customer: ${customer?.name ?? invoice.customerId}`}
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Grand total" value={formatCurrency(invoice.grandTotal)} />
        <MetricCard label="Paid" value={formatCurrency(invoice.paidAmount)} />
        <MetricCard label="Outstanding" value={formatCurrency(invoice.balance)} />
        <MetricCard
          label="Status"
          value={<RentalInvoiceStatusBadge status={invoice.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Invoice summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Invoice number" value={invoice.invoiceNumber} />
              <DetailField label="Invoice date" value={formatDate(invoice.invoiceDate)} />
              <DetailField
                label="Due date"
                value={invoice.dueDate ? formatDate(invoice.dueDate) : null}
              />
              <DetailField label="Notes" value={invoice.notes} />
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Payment status
                </dt>
                <dd>
                  <PaymentStatusBadge
                    status={invoice.status}
                    balance={invoice.balance}
                    paidAmount={invoice.paidAmount}
                  />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Customer">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Customer" value={customer?.name} />
              <DetailField label="Customer code" value={customer?.customerCode} />
              {customer ? (
                <div className="sm:col-span-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={ROUTES.customerDetail(customer.id)} />}
                  >
                    View customer
                  </AppButton>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Related rental order">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Order number"
                value={rentalOrderLabelById.get(invoice.rentalOrderId)}
              />
              <div className="sm:col-span-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  render={<Link href={ROUTES.rentalOrderDetail(invoice.rentalOrderId)} />}
                >
                  View rental order
                </AppButton>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Invoice items">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium" scope="col">Type</th>
                    <th className="px-3 py-2 font-medium" scope="col">Description</th>
                    <th className="px-3 py-2 font-medium" scope="col">Qty</th>
                    <th className="px-3 py-2 font-medium" scope="col">Unit price</th>
                    <th className="px-3 py-2 font-medium" scope="col">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{LINE_TYPE_LABELS[item.lineType]}</td>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Totals">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              <DetailField label="Discount" value={formatCurrency(invoice.discount)} />
              <DetailField label="Tax" value={formatCurrency(invoice.tax)} />
              <DetailField label="Grand total" value={formatCurrency(invoice.grandTotal)} />
              <DetailField label="Paid amount" value={formatCurrency(invoice.paidAmount)} />
              <DetailField label="Outstanding balance" value={formatCurrency(invoice.balance)} />
            </dl>
          </SectionCard>

          {charges.length > 0 ? (
            <SectionCard title="Rental & additional charges">
              <p className="text-sm text-muted-foreground">
                {charges.length} charge line(s) totaling{" "}
                {formatCurrency(invoice.subtotal)} subtotal from backend.
              </p>
            </SectionCard>
          ) : null}

          {discounts.length > 0 ? (
            <SectionCard title="Discounts">
              <p className="text-sm text-muted-foreground">
                {discounts.length} discount line(s) — {formatCurrency(invoice.discount)} total.
              </p>
            </SectionCard>
          ) : null}

          {taxes.length > 0 ? (
            <SectionCard title="Taxes">
              <p className="text-sm text-muted-foreground">
                {taxes.length} tax line(s) — {formatCurrency(invoice.tax)} total.
              </p>
            </SectionCard>
          ) : null}

          <EmptyCard
            title="Payment history"
            description="Payment records will appear here when the payments module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
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

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(invoice.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(invoice.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Accounting journal"
            description="Accounting entries will appear here when accounting integration is connected."
          />

          <EmptyCard
            title="Audit timeline"
            description="Audit trail details will appear here when available from the API."
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
    </PageContainer>
  );
}
