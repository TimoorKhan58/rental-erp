"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateDispatch } from "../hooks";
import { DispatchForm } from "../forms";
import { toCreateDispatchPayload } from "../mappers";
import type { CreateDispatchFormValues } from "../schemas";

export function DispatchCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createMutation = useCreateDispatch();
  const rentalOrderId = searchParams.get("rentalOrderId") ?? undefined;

  const handleSubmit = async (values: CreateDispatchFormValues) => {
    const dispatch = await createMutation.mutateAsync(toCreateDispatchPayload(values));
    router.push(ROUTES.dispatchDetail(dispatch.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New dispatch"
        description="Choose the order and the items that are going out."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Dispatches", href: ROUTES.dispatches },
          { label: "New dispatch" },
        ]}
      />

      <DispatchForm
        mode="create"
        defaultValues={rentalOrderId ? { rentalOrderId } : undefined}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.dispatches)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
