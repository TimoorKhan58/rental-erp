"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useCustomer, useUpdateCustomer } from "../hooks";
import { CustomerForm } from "../forms";
import { toCustomerFormValues, toUpdateCustomerPayload } from "../mappers";
import type { UpdateCustomerFormValues } from "../schemas";

type CustomerEditPageProps = {
  customerId: string;
};

export function CustomerEditPage({ customerId }: CustomerEditPageProps) {
  const router = useRouter();
  const { data: customer, isLoading, isError, error, refetch } = useCustomer(customerId);
  const updateMutation = useUpdateCustomer();

  const handleSubmit = async (values: UpdateCustomerFormValues) => {
    await updateMutation.mutateAsync({
      id: customerId,
      payload: toUpdateCustomerPayload(values),
    });
    router.push(ROUTES.customerDetail(customerId));
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading customer..." />
      </PageContainer>
    );
  }

  if (isError || !customer) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Customer not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested customer could not be loaded."}
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
        title="Edit customer"
        description={`Update profile for ${customer.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Customers", href: ROUTES.customers },
          { label: customer.name, href: ROUTES.customerDetail(customer.id) },
          { label: "Edit" },
        ]}
      />

      <CustomerForm
        mode="edit"
        defaultValues={toCustomerFormValues(customer)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.customerDetail(customerId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
