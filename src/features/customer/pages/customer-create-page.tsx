"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateCustomer } from "../hooks";
import { CustomerForm } from "../forms";
import { toCreateCustomerPayload } from "../mappers";
import type { CreateCustomerFormValues } from "../schemas";

export function CustomerCreatePage() {
  const router = useRouter();
  const createMutation = useCreateCustomer();

  const handleSubmit = async (values: CreateCustomerFormValues) => {
    const customer = await createMutation.mutateAsync(toCreateCustomerPayload(values));
    router.push(ROUTES.customerDetail(customer.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New customer"
        description="Create a new customer profile."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Customers", href: ROUTES.customers },
          { label: "New customer" },
        ]}
      />

      <CustomerForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.customers)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
