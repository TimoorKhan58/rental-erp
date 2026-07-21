"use client";

import { useRouter } from "next/navigation";
import { UserPlusIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { AppBreadcrumb } from "@/components/design-system/navigation";
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
    <PageContainer className="space-y-6">
      <header className="space-y-4">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", href: ROUTES.dashboard },
            { label: "Customers", href: ROUTES.customers },
            { label: "New customer" },
          ]}
        />
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <UserPlusIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">New customer</h1>
            <p className="text-sm text-muted-foreground">
              Create a customer profile with contact details and account status.
            </p>
          </div>
        </div>
      </header>

      <CustomerForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.customers)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
