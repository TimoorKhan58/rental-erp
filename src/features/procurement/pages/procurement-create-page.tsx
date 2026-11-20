"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateProcurement } from "../hooks";
import { ProcurementForm } from "../forms";
import { toCreateProcurementPayload } from "../mappers";
import type { CreateProcurementFormValues } from "../schemas";

export function ProcurementCreatePage() {
  const router = useRouter();
  const createMutation = useCreateProcurement();

  const handleSubmit = async (values: CreateProcurementFormValues) => {
    const procurement = await createMutation.mutateAsync(toCreateProcurementPayload(values));
    router.push(ROUTES.procurementDetail(procurement.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New purchase order"
        description="Start a purchase order as a draft. Stock does not change until the goods are received."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Purchases", href: ROUTES.procurements },
          { label: "New purchase order" },
        ]}
      />

      <ProcurementForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.procurements)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
