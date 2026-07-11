"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateRentalOrder } from "../hooks";
import { RentalOrderForm } from "../forms";
import { toCreateRentalOrderPayload } from "../mappers";
import type { CreateRentalOrderFormValues } from "../schemas";

export function RentalOrderCreatePage() {
  const router = useRouter();
  const createMutation = useCreateRentalOrder();

  const handleSubmit = async (values: CreateRentalOrderFormValues) => {
    const order = await createMutation.mutateAsync(toCreateRentalOrderPayload(values));
    router.push(ROUTES.rentalOrderDetail(order.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New rental order"
        description="Create a draft rental order for a customer."
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
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
