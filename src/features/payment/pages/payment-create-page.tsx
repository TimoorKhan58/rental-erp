"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreatePayment } from "../hooks";
import { PaymentForm } from "../forms";
import { toCreatePaymentPayload } from "../mappers";
import type { CreatePaymentFormValues } from "../schemas";

export function PaymentCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createMutation = useCreatePayment();

  const defaultValues = useMemo<Partial<CreatePaymentFormValues>>(() => {
    const rentalInvoiceId = searchParams.get("rentalInvoiceId") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;

    return {
      ...(customerId ? { customerId } : {}),
      ...(rentalInvoiceId ? { rentalInvoiceId } : {}),
    };
  }, [searchParams]);

  const handleSubmit = async (values: CreatePaymentFormValues) => {
    const payment = await createMutation.mutateAsync(toCreatePaymentPayload(values));
    router.push(ROUTES.paymentDetail(payment.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Receive a payment"
        description="Choose the customer and invoice. The full balance is filled in; change it if they paid part."
        breadcrumbs={[
          { label: "Payments", href: ROUTES.payments },
          { label: "Receive a payment" },
        ]}
      />

      <PaymentForm
        mode="create"
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.payments)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
