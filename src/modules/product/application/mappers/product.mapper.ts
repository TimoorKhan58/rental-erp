import type { Product } from "@/modules/product/domain/product.entity";
import type { ProductRecord } from "@/modules/product/domain/product.repository.interface";
import type {
  CreateProductData,
  ProductMetadata,
  UpdateProductData,
} from "@/modules/product/domain/product.types";
import type { ProductId } from "@/shared/domain/ids";
import {
  createProductCode,
  createProductName,
  createRentalRate,
  createReplacementCost,
  createUnit,
} from "@/modules/product/domain";

import type { ProductDto } from "../dtos/product.dto";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../schemas/product.schemas";
import {
  toBrandId,
  toCategoryId,
  toProductAttributeId,
  toProductTagId,
  toUnitOfMeasureId,
} from "./product-list.mapper";
import { decimalToDtoString } from "./product-decimal.mapper";

export function toProductDto(record: ProductRecord): ProductDto;
export function toProductDto(product: Product, metadata: ProductMetadata): ProductDto;
export function toProductDto(
  productOrRecord: Product | ProductRecord,
  metadata?: ProductMetadata,
): ProductDto {
  const product =
    "product" in productOrRecord ? productOrRecord.product : productOrRecord;
  const resolvedMetadata =
    "metadata" in productOrRecord ? productOrRecord.metadata : metadata!;

  const props = product.toProps();

  return {
    id: props.id,
    productCode: props.productCode,
    name: props.name,
    description: props.description,
    unit: props.unit,
    rentalRate: decimalToDtoString(props.rentalRate)!,
    replacementCost: decimalToDtoString(props.replacementCost),
    isActive: props.isActive,
    categoryId: props.categoryId,
    brandId: props.brandId,
    unitId: props.unitId,
    tags: resolvedMetadata.tagIds,
    images: resolvedMetadata.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText ?? null,
      sortOrder: image.sortOrder ?? 0,
      isPrimary: image.isPrimary ?? false,
    })),
    specifications: resolvedMetadata.specifications.map((specification) => ({
      id: specification.id,
      key: specification.key,
      value: specification.value,
      sortOrder: specification.sortOrder ?? 0,
    })),
    attributeValues: resolvedMetadata.attributeValues.map((attributeValue) => ({
      id: attributeValue.id,
      attributeId: attributeValue.attributeId,
      value: attributeValue.value,
    })),
    variantCount: resolvedMetadata.variantCount,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateProductData(input: CreateProductInput): CreateProductData {
  return {
    productCode: createProductCode(input.productCode),
    name: createProductName(input.name),
    description: input.description,
    unit: createUnit(input.unit),
    rentalRate: createRentalRate(input.rentalRate),
    replacementCost: createReplacementCost(input.replacementCost),
    isActive: input.isActive,
    categoryId:
      input.categoryId !== undefined && input.categoryId !== null
        ? toCategoryId(input.categoryId)
        : input.categoryId ?? undefined,
    brandId:
      input.brandId !== undefined && input.brandId !== null
        ? toBrandId(input.brandId)
        : input.brandId ?? undefined,
    unitId:
      input.unitId !== undefined && input.unitId !== null
        ? toUnitOfMeasureId(input.unitId)
        : input.unitId ?? undefined,
    tagIds: input.tagIds?.map(toProductTagId),
    images: input.images,
    specifications: input.specifications,
    attributeValues: input.attributeValues?.map((attributeValue) => ({
      attributeId: toProductAttributeId(attributeValue.attributeId),
      value: attributeValue.value,
    })),
  };
}

export function toUpdateProductData(input: UpdateProductInput): UpdateProductData {
  return {
    name: input.name !== undefined ? createProductName(input.name) : undefined,
    description: input.description,
    unit: input.unit !== undefined ? createUnit(input.unit) : undefined,
    rentalRate:
      input.rentalRate !== undefined
        ? createRentalRate(input.rentalRate)
        : undefined,
    replacementCost:
      input.replacementCost !== undefined
        ? createReplacementCost(input.replacementCost)
        : undefined,
    isActive: input.isActive,
    categoryId:
      input.categoryId !== undefined
        ? input.categoryId === null
          ? null
          : toCategoryId(input.categoryId)
        : undefined,
    brandId:
      input.brandId !== undefined
        ? input.brandId === null
          ? null
          : toBrandId(input.brandId)
        : undefined,
    unitId:
      input.unitId !== undefined
        ? input.unitId === null
          ? null
          : toUnitOfMeasureId(input.unitId)
        : undefined,
    tagIds: input.tagIds?.map(toProductTagId),
    images: input.images,
    specifications: input.specifications,
    attributeValues: input.attributeValues?.map((attributeValue) => ({
      attributeId: toProductAttributeId(attributeValue.attributeId),
      value: attributeValue.value,
    })),
  };
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}
