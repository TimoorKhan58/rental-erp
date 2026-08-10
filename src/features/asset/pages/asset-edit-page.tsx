"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useAsset, useUpdateAsset } from "../hooks";
import { AssetForm } from "../forms";
import {
  canEditAsset,
  toAssetFormValues,
  toUpdateAssetPayload,
} from "../mappers";
import type { UpdateAssetFormValues } from "../schemas";

type AssetEditPageProps = {
  assetId: string;
};

export function AssetEditPage({ assetId }: AssetEditPageProps) {
  const router = useRouter();
  const { data: asset, isLoading, isError } = useAsset(assetId);
  const updateMutation = useUpdateAsset();

  useEffect(() => {
    if (asset && !canEditAsset(asset.status)) {
      router.replace(ROUTES.assetDetail(assetId));
    }
  }, [asset, assetId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading asset..." />
      </PageContainer>
    );
  }

  if (isError || !asset) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Asset not found</p>
          <p className="text-sm text-muted-foreground">
            The requested asset could not be loaded.
          </p>
        </div>
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateAssetFormValues) => {
    await updateMutation.mutateAsync({
      id: assetId,
      payload: toUpdateAssetPayload(values),
    });
    router.push(ROUTES.assetDetail(assetId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${asset.assetCode}`}
        description="Update asset details."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Assets", href: ROUTES.assets },
          { label: asset.assetCode, href: ROUTES.assetDetail(assetId) },
          { label: "Edit" },
        ]}
      />

      <AssetForm
        mode="edit"
        assetCode={asset.assetCode}
        defaultValues={toAssetFormValues(asset)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.assetDetail(assetId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
