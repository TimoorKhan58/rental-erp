"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useDispatch, useUpdateDispatch } from "../hooks";
import { DispatchForm } from "../forms";
import { canEditDispatch, toDispatchFormValues, toUpdateDispatchPayload } from "../mappers";
import type { UpdateDispatchFormValues } from "../schemas";

type DispatchEditPageProps = {
  dispatchId: string;
};

export function DispatchEditPage({ dispatchId }: DispatchEditPageProps) {
  const router = useRouter();
  const { data: dispatch, isLoading, isError } = useDispatch(dispatchId);
  const updateMutation = useUpdateDispatch();

  const isEditable = dispatch ? canEditDispatch(dispatch.status) : false;

  useEffect(() => {
    if (dispatch && !canEditDispatch(dispatch.status)) {
      router.replace(ROUTES.dispatchDetail(dispatchId));
    }
  }, [dispatch, dispatchId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading dispatch..." />
      </PageContainer>
    );
  }

  if (isError || !dispatch) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Dispatch not found</p>
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

  const handleSubmit = async (values: UpdateDispatchFormValues) => {
    await updateMutation.mutateAsync({
      id: dispatchId,
      payload: toUpdateDispatchPayload(values),
    });
    router.push(ROUTES.dispatchDetail(dispatchId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${dispatch.dispatchNumber}`}
        description="Update draft dispatch details and line items."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Deliveries", href: ROUTES.dispatches },
          { label: dispatch.dispatchNumber, href: ROUTES.dispatchDetail(dispatchId) },
          { label: "Edit" },
        ]}
      />

      <DispatchForm
        mode="edit"
        dispatchNumber={dispatch.dispatchNumber}
        rentalOrderId={dispatch.rentalOrderId}
        defaultValues={toDispatchFormValues(dispatch)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.dispatchDetail(dispatchId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
