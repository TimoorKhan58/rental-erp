"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateRentalInvoice } from "../hooks";
import { RentalInvoiceForm } from "../forms";
import { toCreateRentalInvoicePayload } from "../mappers";
import type { CreateRentalInvoiceFormValues } from "../schemas";

export function RentalInvoiceCreatePage() {
  const router = useRouter();
  const createMutation = useCreateRentalInvoice();

  const handleSubmit = async (values: CreateRentalInvoiceFormValues) => {
    const invoice = await createMutation.mutateAsync(
      toCreateRentalInvoicePayload(values),
    );
    router.push(ROUTES.rentalInvoiceDetail(invoice.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Create rental invoice"
        description="Bill a completed rental order with line items and totals."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental invoices", href: ROUTES.rentalInvoices },
          { label: "Create invoice" },
        ]}
      />

      <RentalInvoiceForm
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.rentalInvoices)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
