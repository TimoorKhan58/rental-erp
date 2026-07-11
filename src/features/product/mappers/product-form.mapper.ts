import type {
  CreateProductFormValues,
  UpdateProductFormValues,
} from "../schemas";
import type {
  CreateProductPayload,
  ProductResponse,
  UpdateProductPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function normalizeOptionalNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function toCreateProductPayload(
  values: CreateProductFormValues,
): CreateProductPayload {
  return {
    productCode: values.productCode.trim(),
    name: values.name.trim(),
    description: normalizeOptionalString(values.description),
    unit: values.unit.trim(),
    rentalRate: values.rentalRate,
    replacementCost: normalizeOptionalNumber(values.replacementCost),
    categoryId: normalizeOptionalString(values.categoryId),
    brandId: normalizeOptionalString(values.brandId),
    unitId: normalizeOptionalString(values.unitId),
    isActive: values.isActive,
  };
}

export function toUpdateProductPayload(
  values: UpdateProductFormValues,
): UpdateProductPayload {
  return {
    name: values.name.trim(),
    description: normalizeOptionalString(values.description),
    unit: values.unit.trim(),
    rentalRate: values.rentalRate,
    replacementCost: normalizeOptionalNumber(values.replacementCost),
    categoryId: normalizeOptionalString(values.categoryId),
    brandId: normalizeOptionalString(values.brandId),
    unitId: normalizeOptionalString(values.unitId),
    isActive: values.isActive,
  };
}

export function toProductFormValues(product: ProductResponse): UpdateProductFormValues {
  return {
    name: product.name,
    description: product.description ?? "",
    unit: product.unit,
    rentalRate: Number(product.rentalRate),
    replacementCost:
      product.replacementCost === null ? null : Number(product.replacementCost),
    categoryId: product.categoryId ?? "",
    brandId: product.brandId ?? "",
    unitId: product.unitId ?? "",
    isActive: product.isActive,
  };
}
