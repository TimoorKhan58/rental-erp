"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useRepair, useUpdateRepair } from "../hooks";
import { RepairForm } from "../forms";
import { canEditRepair, toRepairFormValues, toUpdateRepairPayload } from "../mappers";
import type { UpdateRepairFormValues } from "../schemas";

type RepairEditPageProps = {
  repairId: string;
};

export function RepairEditPage({ repairId }: RepairEditPageProps) {
  const router = useRouter();
  const { data: repair, isLoading, isError } = useRepair(repairId);
  const updateMutation = useUpdateRepair();

  useEffect(() => {
    if (repair && !canEditRepair(repair.status)) {
      router.replace(ROUTES.repairDetail(repairId));
    }
  }, [repair, repairId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading repair..." />
      </PageContainer>
    );
  }

  if (isError || !repair) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Repair not found</p>
          <p className="text-sm text-muted-foreground">
            The requested repair could not be loaded.
          </p>
        </div>
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateRepairFormValues) => {
    await updateMutation.mutateAsync({
      id: repairId,
      payload: toUpdateRepairPayload(values),
    });
    router.push(ROUTES.repairDetail(repairId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${repair.repairNumber}`}
        description="Update repair details while in pending status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Repairs", href: ROUTES.repairs },
          { label: repair.repairNumber, href: ROUTES.repairDetail(repairId) },
          { label: "Edit" },
        ]}
      />

      <RepairForm
        mode="edit"
        repairNumber={repair.repairNumber}
        returnId={repair.returnId}
        returnItemId={repair.returnItemId}
        productId={repair.productId}
        warehouseId={repair.warehouseId}
        repairId={repairId}
        defaultValues={toRepairFormValues(repair)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.repairDetail(repairId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
