"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateReturn } from "../hooks";
import { ReturnForm } from "../forms";
import { toCreateReturnPayload } from "../mappers";
import type { CreateReturnFormValues } from "../schemas";

export function ReturnCreatePage() {
  const router = useRouter();
  const createMutation = useCreateReturn();

  const handleSubmit = async (values: CreateReturnFormValues) => {
    const returnRecord = await createMutation.mutateAsync(toCreateReturnPayload(values));
    router.push(ROUTES.returnDetail(returnRecord.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New return"
        description="Create a return for a completed dispatch."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Returns", href: ROUTES.returns },
          { label: "New return" },
        ]}
      />

      <ReturnForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.returns)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
