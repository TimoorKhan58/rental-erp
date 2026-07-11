"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateMaintenance } from "../hooks";
import { MaintenanceForm } from "../forms";
import { toCreateMaintenancePayload } from "../mappers";
import type { CreateMaintenanceFormValues } from "../schemas";

export function MaintenanceCreatePage() {
  const router = useRouter();
  const createMutation = useCreateMaintenance();

  const handleSubmit = async (values: CreateMaintenanceFormValues) => {
    const maintenance = await createMutation.mutateAsync(toCreateMaintenancePayload(values));
    router.push(ROUTES.maintenanceDetail(maintenance.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New maintenance"
        description="Schedule a maintenance job for an inventory item."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Maintenance", href: ROUTES.maintenance },
          { label: "New maintenance" },
        ]}
      />

      <MaintenanceForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.maintenance)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
