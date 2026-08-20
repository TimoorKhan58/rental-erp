"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateRepair } from "../hooks";
import { RepairForm } from "../forms";
import { toCreateRepairPayload } from "../mappers";
import type { CreateRepairFormValues } from "../schemas";

export function RepairCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createMutation = useCreateRepair();
  const returnId = searchParams.get("returnId") ?? undefined;
  const returnItemId = searchParams.get("returnItemId") ?? undefined;

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
        defaultValues={
          returnId || returnItemId
            ? {
                returnId: returnId ?? "",
                returnItemId: returnItemId ?? "",
              }
            : undefined
        }
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.repairs)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
