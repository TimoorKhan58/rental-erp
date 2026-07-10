import { Prisma } from "@/generated/prisma/client";
import { Product } from "@/modules/product/domain/product.entity";
import type { ProductRecord } from "@/modules/product/domain/product.repository.interface";
import type {
  CreateProductData,
  ProductAttributeValueData,
  ProductImageData,
  ProductMetadata,
  ProductSpecificationData,
  ProductTagIds,
  UpdateProductData,
} from "@/modules/product/domain/product.types";
import {
  createProductCode,
  createProductName,
  createRentalRate,
  createReplacementCost,
  createUnit,
} from "@/modules/product/domain";
import type {
  BrandId,
  CategoryId,
  ProductAttributeId,
  ProductAttributeValueId,
  ProductId,
  ProductImageId,
  ProductSpecificationId,
  ProductTagId,
  UnitOfMeasureId,
} from "@/shared/domain/ids";

export const PRODUCT_DETAIL_INCLUDE = {
  tagAssignments: {
    select: {
      tagId: true,
    },
  },
  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
  specifications: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
  attributeValues: true,
  _count: {
    select: {
      variants: true,
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductDetailRecord = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_DETAIL_INCLUDE;
}>;

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

export function toProductMetadata(record: ProductDetailRecord): ProductMetadata {
  return {
    tagIds: record.tagAssignments.map(
      (assignment) => assignment.tagId as ProductTagId,
    ),
    images: record.images.map((image) => ({
      id: image.id as ProductImageId,
      url: image.url,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    })),
    specifications: record.specifications.map((specification) => ({
      id: specification.id as ProductSpecificationId,
      key: specification.key,
      value: specification.value,
      sortOrder: specification.sortOrder,
    })),
    attributeValues: record.attributeValues.map((attributeValue) => ({
      id: attributeValue.id as ProductAttributeValueId,
      attributeId: attributeValue.attributeId as ProductAttributeId,
      value: attributeValue.value,
    })),
    variantCount: record._count.variants,
  };
}

export function toProductDomain(record: {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  unit: string;
  rentalPricePerDay: Prisma.Decimal;
  purchaseCost: Prisma.Decimal;
  categoryId: string | null;
  brandId: string | null;
  unitId: string | null;
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
    categoryId: record.categoryId as CategoryId | null,
    brandId: record.brandId as BrandId | null,
    unitId: record.unitId as UnitOfMeasureId | null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toProductRecord(record: ProductDetailRecord): ProductRecord {
  return {
    product: toProductDomain(record),
    metadata: toProductMetadata(record),
  };
}

function mapTagAssignments(
  tagIds?: ProductTagIds,
): Prisma.ProductUncheckedCreateInput["tagAssignments"] {
  if (tagIds === undefined || tagIds.length === 0) {
    return undefined;
  }

  return {
    create: tagIds.map((tagId) => ({
      tagId,
    })),
  };
}

function mapImages(
  images?: ProductImageData[],
): Prisma.ProductUncheckedCreateInput["images"] {
  if (images === undefined || images.length === 0) {
    return undefined;
  }

  return {
    create: images.map((image, index) => ({
      url: image.url,
      altText: image.altText ?? null,
      sortOrder: image.sortOrder ?? index,
      isPrimary: image.isPrimary ?? index === 0,
    })),
  };
}

function mapSpecifications(
  specifications?: ProductSpecificationData[],
): Prisma.ProductUncheckedCreateInput["specifications"] {
  if (specifications === undefined || specifications.length === 0) {
    return undefined;
  }

  return {
    create: specifications.map((specification, index) => ({
      key: specification.key,
      value: specification.value,
      sortOrder: specification.sortOrder ?? index,
    })),
  };
}

function mapAttributeValues(
  attributeValues?: ProductAttributeValueData[],
): Prisma.ProductUncheckedCreateInput["attributeValues"] {
  if (attributeValues === undefined || attributeValues.length === 0) {
    return undefined;
  }

  return {
    create: attributeValues.map((attributeValue) => ({
      attributeId: attributeValue.attributeId,
      value: attributeValue.value,
    })),
  };
}

export function toProductCreateInput(
  data: CreateProductData,
): Prisma.ProductUncheckedCreateInput {
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
    categoryId: normalized.categoryId,
    brandId: normalized.brandId,
    unitId: normalized.unitId,
    tagAssignments: mapTagAssignments(data.tagIds),
    images: mapImages(data.images),
    specifications: mapSpecifications(data.specifications),
    attributeValues: mapAttributeValues(data.attributeValues),
  };
}

function mapUpdateCatalogRelations(data: UpdateProductData): Pick<
  Prisma.ProductUncheckedUpdateInput,
  "categoryId" | "brandId" | "unitId"
> {
  return {
    ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
    ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
    ...(data.unitId !== undefined ? { unitId: data.unitId } : {}),
  };
}

function mapUpdateTagAssignments(
  tagIds?: ProductTagIds,
): Prisma.ProductUncheckedUpdateInput["tagAssignments"] | undefined {
  if (tagIds === undefined) {
    return undefined;
  }

  return {
    deleteMany: {},
    ...(tagIds.length > 0
      ? {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        }
      : {}),
  };
}

function mapUpdateImages(
  images?: ProductImageData[],
): Prisma.ProductUncheckedUpdateInput["images"] | undefined {
  if (images === undefined) {
    return undefined;
  }

  return {
    deleteMany: {},
    ...(images.length > 0
      ? {
          create: images.map((image, index) => ({
            url: image.url,
            altText: image.altText ?? null,
            sortOrder: image.sortOrder ?? index,
            isPrimary: image.isPrimary ?? index === 0,
          })),
        }
      : {}),
  };
}

function mapUpdateSpecifications(
  specifications?: ProductSpecificationData[],
): Prisma.ProductUncheckedUpdateInput["specifications"] | undefined {
  if (specifications === undefined) {
    return undefined;
  }

  return {
    deleteMany: {},
    ...(specifications.length > 0
      ? {
          create: specifications.map((specification, index) => ({
            key: specification.key,
            value: specification.value,
            sortOrder: specification.sortOrder ?? index,
          })),
        }
      : {}),
  };
}

function mapUpdateAttributeValues(
  attributeValues?: ProductAttributeValueData[],
): Prisma.ProductUncheckedUpdateInput["attributeValues"] | undefined {
  if (attributeValues === undefined) {
    return undefined;
  }

  return {
    deleteMany: {},
    ...(attributeValues.length > 0
      ? {
          create: attributeValues.map((attributeValue) => ({
            attributeId: attributeValue.attributeId,
            value: attributeValue.value,
          })),
        }
      : {}),
  };
}

export function toProductUpdateInput(
  data: UpdateProductData,
): Prisma.ProductUncheckedUpdateInput {
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
    ...mapUpdateCatalogRelations(data),
    tagAssignments: mapUpdateTagAssignments(data.tagIds),
    images: mapUpdateImages(data.images),
    specifications: mapUpdateSpecifications(data.specifications),
    attributeValues: mapUpdateAttributeValues(data.attributeValues),
  };
}
