"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateSupplier } from "../hooks";
import { SupplierForm } from "../forms";
import { toCreateSupplierPayload } from "../mappers";
import type { CreateSupplierFormValues } from "../schemas";

export function SupplierCreatePage() {
  const router = useRouter();
  const createMutation = useCreateSupplier();

  const handleSubmit = async (values: CreateSupplierFormValues) => {
    const supplier = await createMutation.mutateAsync(toCreateSupplierPayload(values));
    router.push(ROUTES.supplierDetail(supplier.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New supplier"
        description="Create a new supplier profile."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Suppliers", href: ROUTES.suppliers },
          { label: "New supplier" },
        ]}
      />

      <SupplierForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.suppliers)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
