"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateDispatch } from "../hooks";
import { DispatchForm } from "../forms";
import { toCreateDispatchPayload } from "../mappers";
import type { CreateDispatchFormValues } from "../schemas";

export function DispatchCreatePage() {
  const router = useRouter();
  const createMutation = useCreateDispatch();

  const handleSubmit = async (values: CreateDispatchFormValues) => {
    const dispatch = await createMutation.mutateAsync(toCreateDispatchPayload(values));
    router.push(ROUTES.dispatchDetail(dispatch.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New dispatch"
        description="Create a dispatch for a confirmed or reserved rental order."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Deliveries", href: ROUTES.dispatches },
          { label: "New dispatch" },
        ]}
      />

      <DispatchForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.dispatches)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
