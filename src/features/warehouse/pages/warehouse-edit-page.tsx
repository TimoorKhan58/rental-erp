"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useWarehouse, useUpdateWarehouse } from "../hooks";
import { WarehouseForm } from "../forms";
import { toWarehouseFormValues, toUpdateWarehousePayload } from "../mappers";
import type { UpdateWarehouseFormValues } from "../schemas";

type WarehouseEditPageProps = {
  warehouseId: string;
};

export function WarehouseEditPage({ warehouseId }: WarehouseEditPageProps) {
  const router = useRouter();
  const { data: warehouse, isLoading, isError, error, refetch } = useWarehouse(warehouseId);
  const updateMutation = useUpdateWarehouse();

  const handleSubmit = async (values: UpdateWarehouseFormValues) => {
    await updateMutation.mutateAsync({
      id: warehouseId,
      payload: toUpdateWarehousePayload(values),
    });
    router.push(ROUTES.warehouseDetail(warehouseId));
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading warehouse..." />
      </PageContainer>
    );
  }

  if (isError || !warehouse) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Warehouse not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested warehouse could not be loaded."}
          </p>
          <AppButton variant="outline" onClick={() => void refetch()}>
            Try again
          </AppButton>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Edit warehouse"
        description={`Update details for ${warehouse.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Warehouses", href: ROUTES.warehouses },
          { label: warehouse.name, href: ROUTES.warehouseDetail(warehouse.id) },
          { label: "Edit" },
        ]}
      />

      <WarehouseForm
        mode="edit"
        defaultValues={toWarehouseFormValues(warehouse)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.warehouseDetail(warehouseId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
