"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useReturn, useUpdateReturn } from "../hooks";
import { ReturnForm } from "../forms";
import { canEditReturn, toReturnFormValues, toUpdateReturnPayload } from "../mappers";
import type { UpdateReturnFormValues } from "../schemas";

type ReturnEditPageProps = {
  returnId: string;
};

export function ReturnEditPage({ returnId }: ReturnEditPageProps) {
  const router = useRouter();
  const { data: returnRecord, isLoading, isError } = useReturn(returnId);
  const updateMutation = useUpdateReturn();

  useEffect(() => {
    if (returnRecord && !canEditReturn(returnRecord.status)) {
      router.replace(ROUTES.returnDetail(returnId));
    }
  }, [returnRecord, returnId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading return..." />
      </PageContainer>
    );
  }

  if (isError || !returnRecord) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Return not found</p>
          <p className="text-sm text-muted-foreground">
            The requested return could not be loaded.
          </p>
        </div>
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateReturnFormValues) => {
    await updateMutation.mutateAsync({
      id: returnId,
      payload: toUpdateReturnPayload(values),
    });
    router.push(ROUTES.returnDetail(returnId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${returnRecord.returnNumber}`}
        description="Update return details while in draft status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Returns", href: ROUTES.returns },
          { label: returnRecord.returnNumber, href: ROUTES.returnDetail(returnId) },
          { label: "Edit" },
        ]}
      />

      <ReturnForm
        mode="edit"
        returnNumber={returnRecord.returnNumber}
        rentalOrderId={returnRecord.rentalOrderId}
        dispatchId={returnRecord.dispatchId}
        returnId={returnId}
        defaultValues={toReturnFormValues(returnRecord)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.returnDetail(returnId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
