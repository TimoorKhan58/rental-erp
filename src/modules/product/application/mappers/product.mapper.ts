import type { Product } from "@/modules/product/domain/product.entity";
import type {
  CreateProductData,
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
import { decimalToDtoString } from "./product-decimal.mapper";

export function toProductDto(product: Product): ProductDto {
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
  };
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}
