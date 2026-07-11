"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useProductPermissions } from "../hooks";
import { ProductListTable } from "../tables";

export function ProductListPage() {
  const { canCreate } = useProductPermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Manage rental products, pricing, and availability."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Products" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.productsNew} />}
            >
              New product
            </AppButton>
          ) : undefined
        }
      />

      <ProductListTable />
    </PageContainer>
  );
}
