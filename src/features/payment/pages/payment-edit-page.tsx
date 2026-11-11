"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { usePayment, useUpdatePayment } from "../hooks";
import { PaymentForm } from "../forms";
import {
  canEditPayment,
  toPaymentFormValues,
  toUpdatePaymentPayload,
} from "../mappers";
import type { UpdatePaymentFormValues } from "../schemas";

type PaymentEditPageProps = {
  paymentId: string;
};

export function PaymentEditPage({ paymentId }: PaymentEditPageProps) {
  const router = useRouter();
  const { data: payment, isLoading, isError, error, refetch } = usePayment(paymentId);
  const updateMutation = useUpdatePayment();

  useEffect(() => {
    if (payment && !canEditPayment(payment.status)) {
      router.replace(ROUTES.paymentDetail(paymentId));
    }
  }, [payment, paymentId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading payment..." />
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

  const handleSubmit = async (values: UpdatePaymentFormValues) => {
    await updateMutation.mutateAsync({
      id: paymentId,
      payload: toUpdatePaymentPayload(values),
    });
    router.push(ROUTES.paymentDetail(paymentId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${payment.paymentNumber}`}
        description="Update payment details while in pending status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Payments", href: ROUTES.payments },
          { label: payment.paymentNumber, href: ROUTES.paymentDetail(paymentId) },
          { label: "Edit" },
        ]}
      />

      <PaymentForm
        mode="edit"
        paymentNumber={payment.paymentNumber}
        customerId={payment.customerId}
        rentalInvoiceId={payment.rentalInvoiceId}
        defaultValues={toPaymentFormValues(payment)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.paymentDetail(paymentId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
