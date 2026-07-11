"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreatePayment } from "../hooks";
import { PaymentForm } from "../forms";
import { toCreatePaymentPayload } from "../mappers";
import type { CreatePaymentFormValues } from "../schemas";

export function PaymentCreatePage() {
  const router = useRouter();
  const createMutation = useCreatePayment();

  const handleSubmit = async (values: CreatePaymentFormValues) => {
    const payment = await createMutation.mutateAsync(toCreatePaymentPayload(values));
    router.push(ROUTES.paymentDetail(payment.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Record payment"
        description="Create a new payment against a rental invoice."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Payments", href: ROUTES.payments },
          { label: "Record payment" },
        ]}
      />

      <PaymentForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.payments)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
