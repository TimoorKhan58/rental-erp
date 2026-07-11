"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateWarehouse } from "../hooks";
import { WarehouseForm } from "../forms";
import { toCreateWarehousePayload } from "../mappers";
import type { CreateWarehouseFormValues } from "../schemas";

export function WarehouseCreatePage() {
  const router = useRouter();
  const createMutation = useCreateWarehouse();

  const handleSubmit = async (values: CreateWarehouseFormValues) => {
    const warehouse = await createMutation.mutateAsync(toCreateWarehousePayload(values));
    router.push(ROUTES.warehouseDetail(warehouse.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New warehouse"
        description="Create a new warehouse location."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Warehouses", href: ROUTES.warehouses },
          { label: "New warehouse" },
        ]}
      />

      <WarehouseForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.warehouses)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
