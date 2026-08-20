"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  useProduct,
  useProductCatalogOptions,
  useProductExtendedCatalogOptions,
  useProductPermissions,
  useProductRelatedData,
} from "../hooks";
import { ProductStatusBadge } from "../components/product-status-badge";
import { ProductDetailSections } from "../components/product-detail-sections";
import { DeleteProductDialog } from "../dialogs/delete-product-dialog";
import { ToggleProductStatusDialog } from "../dialogs/toggle-product-status-dialog";

type ProductDetailPageProps = {
  productId: string;
};

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{display}</dd>
    </div>
  );
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const router = useRouter();
  const { data: product, isLoading, isError, error, refetch } = useProduct(productId);
  const { canUpdate, canDelete } = useProductPermissions();
  const { categoryOptions, brandOptions, unitOptions } = useProductCatalogOptions();
  const { tagNameById, attributeNameById } = useProductExtendedCatalogOptions();
  const relatedData = useProductRelatedData(product);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const categoryName = useMemo(() => {
    if (!product?.categoryId) {
      return null;
    }

    return categoryOptions.find((option) => option.value === product.categoryId)?.label ?? null;
  }, [categoryOptions, product?.categoryId]);

  const brandName = useMemo(() => {
    if (!product?.brandId) {
      return null;
    }

    return brandOptions.find((option) => option.value === product.brandId)?.label ?? null;
  }, [brandOptions, product?.brandId]);

  const unitName = useMemo(() => {
    if (!product?.unitId) {
      return null;
    }

    return unitOptions.find((option) => option.value === product.unitId)?.label ?? null;
  }, [unitOptions, product?.unitId]);

  const tagNames = useMemo(
    () => (product?.tags ?? []).map((tagId) => tagNameById.get(tagId) ?? tagId),
    [product?.tags, tagNameById],
  );

  const attributeEntries = useMemo(
    () =>
      (product?.attributeValues ?? []).map((entry) => ({
        label: attributeNameById.get(entry.attributeId) ?? entry.attributeId,
        value: entry.value,
      })),
    [attributeNameById, product?.attributeValues],
  );

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading product details..." />
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
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.products} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={product.name}
        description={`Product code: ${product.productCode}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Products", href: ROUTES.products },
          { label: product.name },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.products} />}
            >
              Back
            </AppButton>
            {canUpdate ? (
              <AppButton
                variant="outline"
                leftIcon={
                  product.isActive ? (
                    <UserXIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <UserCheckIcon className="size-4" aria-hidden="true" />
                  )
                }
                onClick={() => setStatusOpen(true)}
              >
                {product.isActive ? "Deactivate" : "Activate"}
              </AppButton>
            ) : null}
            {canUpdate ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.productEdit(product.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canDelete ? (
              <AppButton
                variant="destructive"
                leftIcon={<Trash2Icon className="size-4" aria-hidden="true" />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </AppButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Profile"
            actions={<ProductStatusBadge isActive={product.isActive} />}
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Product code" value={product.productCode} />
              <DetailField label="Name" value={product.name} />
              <DetailField label="Unit" value={product.unit} />
              <DetailField label="Variant count" value={product.variantCount} />
              <DetailField label="Description" value={product.description} />
            </dl>
          </SectionCard>

          <SectionCard title="Pricing">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Rental rate"
                value={formatCurrency(Number(product.rentalRate))}
              />
              <DetailField
                label="Replacement cost"
                value={
                  product.replacementCost === null
                    ? null
                    : formatCurrency(Number(product.replacementCost))
                }
              />
            </dl>
          </SectionCard>

          <ProductDetailSections
            product={product}
            categoryName={categoryName}
            brandName={brandName}
            unitName={unitName}
            tagNames={tagNames}
            attributeEntries={attributeEntries}
            inventoryRows={relatedData.inventoryRows}
            inventorySummary={relatedData.inventorySummary}
            warehouseNameById={relatedData.warehouseNameById}
            procurementRows={relatedData.procurementRows}
            rentalStats={relatedData.rentalStats}
            auditLogs={relatedData.auditLogs}
            permissions={relatedData.permissions}
            isLoading={relatedData.isLoading}
          />
        </div>

        <div className="space-y-6">
          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Status" value={product.isActive ? "Active" : "Inactive"} />
              <DetailField label="Created" value={formatDate(product.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(product.updatedAt)} />
            </dl>
          </SectionCard>
        </div>
      </div>

      <DeleteProductDialog
        product={product}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push(ROUTES.products)}
      />

      <ToggleProductStatusDialog
        product={product}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </PageContainer>
  );
}
