"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState } from "@/components/feedback";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useProduct, useUpdateProduct } from "../hooks";
import { ProductForm } from "../forms";
import { toProductFormValues, toUpdateProductPayload } from "../mappers";
import type { UpdateProductFormValues } from "../schemas";

type ProductEditPageProps = {
  productId: string;
};

export function ProductEditPage({ productId }: ProductEditPageProps) {
  const router = useRouter();
  const { data: product, isLoading, isError, error, refetch } = useProduct(productId);
  const updateMutation = useUpdateProduct();

  const handleSubmit = async (values: UpdateProductFormValues) => {
    await updateMutation.mutateAsync({
      id: productId,
      payload: toUpdateProductPayload(values),
    });
    router.push(ROUTES.productDetail(productId));
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading product..." />
      </PageContainer>
    );
  }

  if (isError || !product) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Product not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested product could not be loaded."}
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
        title="Edit product"
        description={`Update details for ${product.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Products", href: ROUTES.products },
          { label: product.name, href: ROUTES.productDetail(product.id) },
          { label: "Edit" },
        ]}
      />

      <ProductForm
        mode="edit"
        defaultValues={toProductFormValues(product)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.productDetail(productId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
