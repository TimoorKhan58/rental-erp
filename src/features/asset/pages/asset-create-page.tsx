"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateAsset } from "../hooks";
import { AssetForm } from "../forms";
import { toCreateAssetPayload } from "../mappers";
import type { CreateAssetFormValues } from "../schemas";

export function AssetCreatePage() {
  const router = useRouter();
  const createMutation = useCreateAsset();

  const handleSubmit = async (values: CreateAssetFormValues) => {
    const asset = await createMutation.mutateAsync(toCreateAssetPayload(values));
    router.push(ROUTES.assetDetail(asset.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Register asset"
        description="Create a new fixed asset record."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Assets", href: ROUTES.assets },
          { label: "Register asset" },
        ]}
      />

      <AssetForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.assets)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
