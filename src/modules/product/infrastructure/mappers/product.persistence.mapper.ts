import { Prisma } from "@/generated/prisma/client";
import { Product } from "@/modules/product/domain/product.entity";
import type {
  CreateProductData,
  UpdateProductData,
} from "@/modules/product/domain/product.types";
import {
  createProductCode,
  createProductName,
  createRentalRate,
  createReplacementCost,
  createUnit,
} from "@/modules/product/domain";
import type { ProductId } from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function replacementCostToPurchaseCost(
  value: number | null | undefined,
): Prisma.Decimal {
  return toPrismaDecimal(value ?? 0);
}

export function toProductDomain(record: {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  unit: string;
  rentalPricePerDay: Prisma.Decimal;
  purchaseCost: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  const purchaseCost = decimalToNumber(record.purchaseCost);

  return Product.reconstitute({
    id: record.id as ProductId,
    productCode: createProductCode(record.productCode),
    name: createProductName(record.name),
    description: record.description,
    unit: createUnit(record.unit),
    rentalRate: createRentalRate(decimalToNumber(record.rentalPricePerDay)),
    replacementCost: createReplacementCost(
      purchaseCost === 0 ? null : purchaseCost,
    ),
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toProductCreateInput(
  data: CreateProductData,
): Omit<Prisma.ProductCreateInput, "category"> {
  const normalized = Product.create(data);

  return {
    productCode: normalized.productCode,
    name: normalized.name,
    description: normalized.description,
    unit: normalized.unit,
    rentalPricePerDay: toPrismaDecimal(normalized.rentalRate),
    purchaseCost: replacementCostToPurchaseCost(normalized.replacementCost),
    totalQuantity: 0,
    minimumStock: 0,
    isRentable: true,
    isActive: normalized.isActive,
  };
}

export function toProductUpdateInput(
  data: UpdateProductData,
): Prisma.ProductUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.unit !== undefined ? { unit: data.unit } : {}),
    ...(data.rentalRate !== undefined
      ? { rentalPricePerDay: toPrismaDecimal(data.rentalRate) }
      : {}),
    ...(data.replacementCost !== undefined
      ? { purchaseCost: replacementCostToPurchaseCost(data.replacementCost) }
      : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
