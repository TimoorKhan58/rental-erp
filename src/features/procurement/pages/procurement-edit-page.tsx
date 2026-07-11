"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useProcurement, useUpdateProcurement } from "../hooks";
import { ProcurementForm } from "../forms";
import { canEditProcurement, toProcurementFormValues, toUpdateProcurementPayload } from "../mappers";
import type { UpdateProcurementFormValues } from "../schemas";

type ProcurementEditPageProps = {
  procurementId: string;
};

export function ProcurementEditPage({ procurementId }: ProcurementEditPageProps) {
  const router = useRouter();
  const { data: procurement, isLoading, isError } = useProcurement(procurementId);
  const updateMutation = useUpdateProcurement();

  const isEditable = procurement ? canEditProcurement(procurement.status) : false;

  useEffect(() => {
    if (procurement && !canEditProcurement(procurement.status)) {
      router.replace(ROUTES.procurementDetail(procurementId));
    }
  }, [procurement, procurementId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading purchase order..." />
      </PageContainer>
    );
  }

  if (isError || !procurement) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Purchase order not found</p>
        </div>
      </PageContainer>
    );
  }

  if (!isEditable) {
    return (
      <PageContainer>
        <LoadingState label="Redirecting..." />
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateProcurementFormValues) => {
    await updateMutation.mutateAsync({
      id: procurementId,
      payload: toUpdateProcurementPayload(values),
    });
    router.push(ROUTES.procurementDetail(procurementId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${procurement.poNumber}`}
        description="Update draft purchase order details and line items."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Procurement", href: ROUTES.procurements },
          { label: procurement.poNumber, href: ROUTES.procurementDetail(procurementId) },
          { label: "Edit" },
        ]}
      />

      <ProcurementForm
        mode="edit"
        poNumber={procurement.poNumber}
        defaultValues={toProcurementFormValues(procurement)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.procurementDetail(procurementId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
