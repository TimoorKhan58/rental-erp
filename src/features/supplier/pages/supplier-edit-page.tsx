"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useSupplier, useUpdateSupplier } from "../hooks";
import { SupplierForm } from "../forms";
import { toSupplierFormValues, toUpdateSupplierPayload } from "../mappers";
import type { UpdateSupplierFormValues } from "../schemas";

type SupplierEditPageProps = {
  supplierId: string;
};

export function SupplierEditPage({ supplierId }: SupplierEditPageProps) {
  const router = useRouter();
  const { data: supplier, isLoading, isError, error, refetch } = useSupplier(supplierId);
  const updateMutation = useUpdateSupplier();

  const handleSubmit = async (values: UpdateSupplierFormValues) => {
    await updateMutation.mutateAsync({
      id: supplierId,
      payload: toUpdateSupplierPayload(values),
    });
    router.push(ROUTES.supplierDetail(supplierId));
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading supplier..." />
      </PageContainer>
    );
  }

  if (isError || !supplier) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Supplier not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested supplier could not be loaded."}
          </p>
          <AppButton variant="outline" onClick={() => void refetch()}>
            Try again
          </AppButton>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Edit supplier"
        description={`Update profile for ${supplier.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Suppliers", href: ROUTES.suppliers },
          { label: supplier.name, href: ROUTES.supplierDetail(supplier.id) },
          { label: "Edit" },
        ]}
      />

      <SupplierForm
        mode="edit"
        defaultValues={toSupplierFormValues(supplier)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.supplierDetail(supplierId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
