"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import {
  useConfirmRentalOrder,
  useCreateRentalOrder,
  useRentalOrderPermissions,
} from "../hooks";
import { RentalOrderForm } from "../forms";
import { toCreateRentalOrderPayload } from "../mappers";
import type { CreateRentalOrderFormValues } from "../schemas";

export function RentalOrderCreatePage() {
  const router = useRouter();
  // "New order" on a customer page starts with that customer (R4).
  const customerId = useSearchParams().get("customerId") ?? undefined;
  const createMutation = useCreateRentalOrder();
  const confirmMutation = useConfirmRentalOrder();
  const { canConfirm } = useRentalOrderPermissions();

  const handleSubmit = async (values: CreateRentalOrderFormValues) => {
    const order = await createMutation.mutateAsync(toCreateRentalOrderPayload(values));

    if (values.bookInAdvance && canConfirm) {
      await confirmMutation.mutateAsync(order.id);
    }

    router.push(ROUTES.rentalOrderDetail(order.id));
  };

  const isSubmitting = createMutation.isPending || confirmMutation.isPending;

  return (
    <PageContainer>
      <PageHeader
        title="New rental order"
        description="Choose the customer, the dates and the items, then check and create the order."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Orders", href: ROUTES.rentalOrders },
          { label: "New rental order" },
        ]}
      />

      <RentalOrderForm
        mode="create"
        defaultValues={customerId ? { customerId } : undefined}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.rentalOrders)}
        isSubmitting={isSubmitting}
      />
    </PageContainer>
  );
}
