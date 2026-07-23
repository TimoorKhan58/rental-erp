"use client";

import { useRouter } from "next/navigation";
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
        description="Create a rental order or book dates in advance for the reservation calendar."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Orders", href: ROUTES.rentalOrders },
          { label: "New rental order" },
        ]}
      />

      <RentalOrderForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.rentalOrders)}
        isSubmitting={isSubmitting}
      />
    </PageContainer>
  );
}
