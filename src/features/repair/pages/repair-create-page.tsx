"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateRepair } from "../hooks";
import { RepairForm } from "../forms";
import { toCreateRepairPayload } from "../mappers";
import type { CreateRepairFormValues } from "../schemas";

export function RepairCreatePage() {
  const router = useRouter();
  const createMutation = useCreateRepair();

  const handleSubmit = async (values: CreateRepairFormValues) => {
    const repair = await createMutation.mutateAsync(toCreateRepairPayload(values));
    router.push(ROUTES.repairDetail(repair.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New repair"
        description="Create a repair job for a damaged return item."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Repairs", href: ROUTES.repairs },
          { label: "New repair" },
        ]}
      />

      <RepairForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.repairs)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
