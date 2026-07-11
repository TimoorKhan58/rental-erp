"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useRentalOrder, useUpdateRentalOrder } from "../hooks";
import { RentalOrderForm } from "../forms";
import { canEditRentalOrder, toRentalOrderFormValues, toUpdateRentalOrderPayload } from "../mappers";
import type { UpdateRentalOrderFormValues } from "../schemas";

type RentalOrderEditPageProps = {
  orderId: string;
};

export function RentalOrderEditPage({ orderId }: RentalOrderEditPageProps) {
  const router = useRouter();
  const { data: order, isLoading, isError } = useRentalOrder(orderId);
  const updateMutation = useUpdateRentalOrder();

  const isEditable = order ? canEditRentalOrder(order.status) : false;

  useEffect(() => {
    if (order && !canEditRentalOrder(order.status)) {
      router.replace(ROUTES.rentalOrderDetail(orderId));
    }
  }, [order, orderId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading rental order..." />
      </PageContainer>
    );
  }

  if (isError || !order) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Rental order not found</p>
        </div>
      </PageContainer>
    );
  }

  if (!isEditable) {
    return (
      <PageContainer>
        <LoadingState label="Redirecting..." />
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateRentalOrderFormValues) => {
    await updateMutation.mutateAsync({
      id: orderId,
      payload: toUpdateRentalOrderPayload(values),
    });
    router.push(ROUTES.rentalOrderDetail(orderId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${order.orderNumber}`}
        description="Update draft rental order details and line items."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Orders", href: ROUTES.rentalOrders },
          { label: order.orderNumber, href: ROUTES.rentalOrderDetail(orderId) },
          { label: "Edit" },
        ]}
      />

      <RentalOrderForm
        mode="edit"
        orderNumber={order.orderNumber}
        defaultValues={toRentalOrderFormValues(order)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.rentalOrderDetail(orderId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
