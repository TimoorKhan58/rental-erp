"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  FileCheckIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard, MetricCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import {
  canEditPayment,
  canPostPayment,
  canVoidPayment,
  METHOD_LABELS,
} from "../mappers";
import {
  usePayment,
  usePaymentFilterOptions,
  usePaymentPermissions,
} from "../hooks";
import { PaymentRecordStatusBadge } from "../components/payment-status-badge";
import { PaymentStatusTimeline } from "../components/payment-status-timeline";
import { PostPaymentDialog } from "../dialogs/post-payment-dialog";
import { VoidPaymentDialog } from "../dialogs/void-payment-dialog";

type PaymentDetailPageProps = {
  paymentId: string;
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

export function PaymentDetailPage({ paymentId }: PaymentDetailPageProps) {
  const router = useRouter();
  const { data: payment, isLoading, isError, error, refetch } = usePayment(paymentId);
  const { canUpdate, canPost, canVoid } = usePaymentPermissions();
  const { customerLabelById, invoiceLabelById } = usePaymentFilterOptions();
  const { data: customer } = useCustomer(payment?.customerId ?? "");

  const [postOpen, setPostOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading payment details..." />
      </PageContainer>
    );
  }

  if (isError || !payment) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Payment not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested payment could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.payments} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={payment.paymentNumber}
        description={`${METHOD_LABELS[payment.paymentMethod]} payment for ${
          customer?.name ?? customerLabelById.get(payment.customerId) ?? payment.customerId
        }`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Payments", href: ROUTES.payments },
          { label: payment.paymentNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.payments} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditPayment(payment.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.paymentEdit(payment.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canPost && canPostPayment(payment.status) ? (
              <AppButton
                leftIcon={<FileCheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setPostOpen(true)}
              >
                Post
              </AppButton>
            ) : null}
            {canVoid && canVoidPayment(payment.status) ? (
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
        <MetricCard label="Amount" value={formatCurrency(payment.amount)} />
        <MetricCard label="Payment date" value={formatDate(payment.paymentDate)} />
        <MetricCard label="Method" value={METHOD_LABELS[payment.paymentMethod]} />
        <MetricCard
          label="Status"
          value={<PaymentRecordStatusBadge status={payment.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Payment summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Payment number" value={payment.paymentNumber} />
              <DetailField label="Payment date" value={formatDate(payment.paymentDate)} />
              <DetailField label="Payment method" value={METHOD_LABELS[payment.paymentMethod]} />
              <DetailField label="Amount" value={formatCurrency(payment.amount)} />
              <DetailField label="Reference number" value={payment.referenceNumber} />
              <DetailField label="Notes" value={payment.notes} />
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

          <SectionCard title="Related invoice">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Invoice"
                value={invoiceLabelById.get(payment.rentalInvoiceId)}
              />
              <div className="sm:col-span-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  render={<Link href={ROUTES.rentalInvoiceDetail(payment.rentalInvoiceId)} />}
                >
                  View invoice
                </AppButton>
              </div>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
            actions={<PaymentRecordStatusBadge status={payment.status} />}
          >
            <PaymentStatusTimeline status={payment.status} />
          </SectionCard>

          <SectionCard title="Milestones">
            <dl className="space-y-4">
              <DetailField
                label="Posted at"
                value={payment.postedAt ? formatDateTime(payment.postedAt) : null}
              />
              <DetailField
                label="Voided at"
                value={payment.voidedAt ? formatDateTime(payment.voidedAt) : null}
              />
            </dl>
          </SectionCard>

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(payment.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(payment.updatedAt)} />
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

      <PostPaymentDialog payment={payment} open={postOpen} onOpenChange={setPostOpen} />

      <VoidPaymentDialog
        payment={payment}
        open={voidOpen}
        onOpenChange={setVoidOpen}
        onVoided={() => router.push(ROUTES.payments)}
      />
    </PageContainer>
  );
}
