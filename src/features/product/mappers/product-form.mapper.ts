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

function mapMetadataPayload(
  values: Pick<
    CreateProductFormValues,
    "tagIds" | "images" | "specifications" | "attributeValues"
  >,
) {
  const images =
    values.images?.map((image, index) => ({
      url: image.url.trim(),
      altText: normalizeOptionalString(image.altText),
      sortOrder: index,
      isPrimary: image.isPrimary ?? index === 0,
    })) ?? [];

  const specifications =
    values.specifications?.map((specification, index) => ({
      key: specification.key.trim(),
      value: specification.value.trim(),
      sortOrder: index,
    })) ?? [];

  const attributeValues =
    values.attributeValues?.map((attributeValue) => ({
      attributeId: attributeValue.attributeId,
      value: attributeValue.value.trim(),
    })) ?? [];

  return {
    tagIds: values.tagIds ?? [],
    images,
    specifications,
    attributeValues,
  };
}

export function toCreateProductPayload(
  values: CreateProductFormValues,
): CreateProductPayload {
  const metadata = mapMetadataPayload(values);

  return {
    ...(values.productCode?.trim()
      ? { productCode: values.productCode.trim() }
      : {}),
    name: values.name.trim(),
    description: normalizeOptionalString(values.description),
    unit: values.unit.trim(),
    rentalRate: values.rentalRate,
    replacementCost: normalizeOptionalNumber(values.replacementCost),
    categoryId: normalizeOptionalString(values.categoryId),
    brandId: normalizeOptionalString(values.brandId),
    unitId: normalizeOptionalString(values.unitId),
    isActive: values.isActive,
    ...metadata,
  };
}

export function toUpdateProductPayload(
  values: UpdateProductFormValues,
): UpdateProductPayload {
  const metadata = mapMetadataPayload(values);

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
    ...metadata,
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
    tagIds: product.tags,
    images: product.images.map((image) => ({
      url: image.url,
      altText: image.altText ?? "",
      isPrimary: image.isPrimary,
    })),
    specifications: product.specifications.map((specification) => ({
      key: specification.key,
      value: specification.value,
    })),
    attributeValues: product.attributeValues.map((attributeValue) => ({
      attributeId: attributeValue.attributeId,
      value: attributeValue.value,
    })),
  };
}
