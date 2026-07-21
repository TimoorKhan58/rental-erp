"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  FileCheckIcon,
  FileTextIcon,
  HashIcon,
  PencilIcon,
  UsersIcon,
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
import { PaymentDetailsTable } from "../components/payment-details-table";
import { PaymentRecordStatusBadge } from "../components/payment-status-badge";
import { PaymentStatusTimeline } from "../components/payment-status-timeline";
import { PaymentWorkflowProgressBar } from "../components/payment-workflow-progress-bar";
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

export function PaymentDetailPage({ paymentId }: PaymentDetailPageProps) {
  const router = useRouter();
  const { data: payment, isLoading, isError, error, refetch } = usePayment(paymentId);
  const { canUpdate, canPost, canVoid } = usePaymentPermissions();
  const { customerLabelById, invoiceLabelById } = usePaymentFilterOptions();
  const { data: customer } = useCustomer(payment?.customerId ?? "");

  const [postOpen, setPostOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const labels = useMemo(() => {
    if (!payment) {
      return null;
    }

    return {
      customerLabel:
        customer?.name ?? customerLabelById.get(payment.customerId) ?? payment.customerId,
      invoiceLabel: invoiceLabelById.get(payment.rentalInvoiceId) ?? payment.rentalInvoiceId,
    };
  }, [payment, customer, customerLabelById, invoiceLabelById]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading payment details..." />
      </PageContainer>
    );
  }

  if (isError || !payment || !labels) {
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
    <PageContainer className="space-y-6">
      <PageHeader
        title={payment.paymentNumber}
        description={`${METHOD_LABELS[payment.paymentMethod]} · ${labels.customerLabel}`}
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

      <Card className="overflow-hidden border-border/60 shadow-soft">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PaymentRecordStatusBadge status={payment.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Paid {formatDate(payment.paymentDate)} · Last updated{" "}
                {formatDateTime(payment.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Payment amount
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(payment.amount)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Payment date"
              value={formatDate(payment.paymentDate)}
              hint="Date payment was received"
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Method"
              value={METHOD_LABELS[payment.paymentMethod]}
              hint="Payment channel"
              icon={<CreditCardIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Reference"
              value={payment.referenceNumber ?? "—"}
              hint="External reference number"
              icon={<HashIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Invoice"
              value={labels.invoiceLabel}
              hint="Linked rental invoice"
              icon={<FileTextIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
          </div>

          {payment.status !== "VOID" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Payment workflow</span>
                <span className="text-muted-foreground">Pending → Posted</span>
              </div>
              <PaymentWorkflowProgressBar status={payment.status} size="md" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Payment details">
            <PaymentDetailsTable
              payment={payment}
              customerLabel={labels.customerLabel}
              invoiceLabel={labels.invoiceLabel}
            />
          </SectionCard>

          {payment.notes ? (
            <SectionCard title="Notes">
              <p className="text-sm text-muted-foreground">{payment.notes}</p>
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
            title="Rental invoice"
            icon={<FileTextIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-info/12 text-info"
            fields={[{ label: "Invoice number", value: labels.invoiceLabel }]}
            href={ROUTES.rentalInvoiceDetail(payment.rentalInvoiceId)}
            linkLabel="View invoice"
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Payment workflow"
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

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(payment.updatedAt)}</p>
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
