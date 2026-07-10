import { Product } from "@/modules/product/domain/product.entity";
import type { CreateProductData } from "@/modules/product/domain/product.types";
import {
  createProductCode,
  createProductName,
  createRentalRate,
  createReplacementCost,
  createUnit,
} from "@/modules/product/domain";
import type { ProductId } from "@/shared/domain/ids";

export const PRODUCT_ID =
  "770e8400-e29b-41d4-a716-446655440000" as ProductId;

export const OTHER_PRODUCT_ID =
  "770e8400-e29b-41d4-a716-446655440001" as ProductId;

export const VALID_CREATE_INPUT = {
  productCode: "PROD-001",
  name: "Wedding Tent 20x40",
  description: "Large wedding tent suitable for outdoor events",
  unit: "day",
  rentalRate: 1500,
  replacementCost: 50000,
  isActive: true,
};

export function buildCreateProductData(
  override: Partial<CreateProductData> = {},
): CreateProductData {
  return {
    productCode: createProductCode(VALID_CREATE_INPUT.productCode),
    name: createProductName(VALID_CREATE_INPUT.name),
    description: VALID_CREATE_INPUT.description,
    unit: createUnit(VALID_CREATE_INPUT.unit),
    rentalRate: createRentalRate(VALID_CREATE_INPUT.rentalRate),
    replacementCost: createReplacementCost(VALID_CREATE_INPUT.replacementCost),
    isActive: VALID_CREATE_INPUT.isActive,
    ...override,
  };
}

export function buildProductEntity(
  override: Partial<ReturnType<typeof Product.create>> & {
    id?: ProductId;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Product {
  const created = Product.create(buildCreateProductData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Product.reconstitute({
    id: override.id ?? PRODUCT_ID,
    productCode: override.productCode ?? created.productCode,
    name: override.name ?? created.name,
    description: override.description ?? created.description,
    unit: override.unit ?? created.unit,
    rentalRate: override.rentalRate ?? created.rentalRate,
    replacementCost: override.replacementCost ?? created.replacementCost,
    isActive: override.isActive ?? created.isActive,
    categoryId: override.categoryId ?? created.categoryId,
    brandId: override.brandId ?? created.brandId,
    unitId: override.unitId ?? created.unitId,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildProductDtoFromEntity(product: Product) {
  const props = product.toProps();

  return {
    id: props.id,
    productCode: props.productCode,
    name: props.name,
    description: props.description,
    unit: props.unit,
    rentalRate: props.rentalRate.toFixed(2),
    replacementCost:
      props.replacementCost === null
        ? null
        : props.replacementCost.toFixed(2),
    isActive: props.isActive,
    categoryId: props.categoryId,
    brandId: props.brandId,
    unitId: props.unitId,
    tags: [],
    images: [],
    specifications: [],
    attributeValues: [],
    variantCount: 0,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}
