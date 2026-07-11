"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateProduct } from "../hooks";
import { ProductForm } from "../forms";
import { toCreateProductPayload } from "../mappers";
import type { CreateProductFormValues } from "../schemas";

export function ProductCreatePage() {
  const router = useRouter();
  const createMutation = useCreateProduct();

  const handleSubmit = async (values: CreateProductFormValues) => {
    const product = await createMutation.mutateAsync(toCreateProductPayload(values));
    router.push(ROUTES.productDetail(product.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New product"
        description="Create a new rental product."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Products", href: ROUTES.products },
          { label: "New product" },
        ]}
      />

      <ProductForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.products)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
