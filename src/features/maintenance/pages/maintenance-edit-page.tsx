"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useMaintenance, useUpdateMaintenance } from "../hooks";
import { MaintenanceForm } from "../forms";
import {
  canEditMaintenance,
  toMaintenanceFormValues,
  toUpdateMaintenancePayload,
} from "../mappers";
import type { UpdateMaintenanceFormValues } from "../schemas";

type MaintenanceEditPageProps = {
  maintenanceId: string;
};

export function MaintenanceEditPage({ maintenanceId }: MaintenanceEditPageProps) {
  const router = useRouter();
  const { data: maintenance, isLoading, isError } = useMaintenance(maintenanceId);
  const updateMutation = useUpdateMaintenance();

  useEffect(() => {
    if (maintenance && !canEditMaintenance(maintenance.status)) {
      router.replace(ROUTES.maintenanceDetail(maintenanceId));
    }
  }, [maintenance, maintenanceId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading maintenance..." />
      </PageContainer>
    );
  }

  if (isError || !maintenance) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Maintenance not found</p>
          <p className="text-sm text-muted-foreground">
            The requested maintenance record could not be loaded.
          </p>
        </div>
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateMaintenanceFormValues) => {
    await updateMutation.mutateAsync({
      id: maintenanceId,
      payload: toUpdateMaintenancePayload(values),
    });
    router.push(ROUTES.maintenanceDetail(maintenanceId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${maintenance.maintenanceNumber}`}
        description="Update maintenance details while in scheduled status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Maintenance", href: ROUTES.maintenance },
          { label: maintenance.maintenanceNumber, href: ROUTES.maintenanceDetail(maintenanceId) },
          { label: "Edit" },
        ]}
      />

      <MaintenanceForm
        mode="edit"
        maintenanceNumber={maintenance.maintenanceNumber}
        productId={maintenance.productId}
        warehouseId={maintenance.warehouseId}
        inventoryId={maintenance.inventoryId}
        defaultValues={toMaintenanceFormValues(maintenance)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.maintenanceDetail(maintenanceId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
