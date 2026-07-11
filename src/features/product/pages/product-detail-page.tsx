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
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useProduct, useProductPermissions } from "../hooks";
import { ProductStatusBadge } from "../components/product-status-badge";
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

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

          <SectionCard title="Classification">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Category ID" value={product.categoryId} />
              <DetailField label="Brand ID" value={product.brandId} />
              <DetailField label="Unit ID" value={product.unitId} />
              <DetailField
                label="Tags"
                value={product.tags.length > 0 ? product.tags.join(", ") : null}
              />
            </dl>
          </SectionCard>

          {product.specifications.length > 0 ? (
            <SectionCard title="Specifications">
              <dl className="grid gap-4 sm:grid-cols-2">
                {product.specifications.map((spec) => (
                  <DetailField key={spec.id} label={spec.key} value={spec.value} />
                ))}
              </dl>
            </SectionCard>
          ) : null}

          {product.images.length > 0 ? (
            <SectionCard title="Images">
              <ul className="space-y-2 text-sm">
                {product.images.map((image) => (
                  <li key={image.id}>
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {image.altText ?? image.url}
                    </a>
                    {image.isPrimary ? (
                      <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <EmptyCard
            title="Inventory summary"
            description="Stock levels and warehouse availability will appear here when the inventory module is connected."
          />

          <EmptyCard
            title="Procurement history"
            description="Purchase order history will appear here when the procurement module is connected."
          />

          <EmptyCard
            title="Rental statistics"
            description="Rental performance metrics will appear here when rental data is connected."
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

          <EmptyCard
            title="Warehouse availability"
            description="Per-warehouse stock assignments will be shown when warehouse inventory APIs are connected."
          />

          <EmptyCard
            title="Audit summary"
            description="Audit trail details will be shown when available from the API."
          />
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
