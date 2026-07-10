import type {
  BrandId,
  CategoryId,
  ProductAttributeId,
  ProductTagId,
  UnitOfMeasureId,
} from "@/shared/domain/ids";

import type { ProductCode } from "./value-objects/product-code.vo";
import type { ProductName } from "./value-objects/product-name.vo";
import type { RentalRate } from "./value-objects/rental-rate.vo";
import type { ReplacementCost } from "./value-objects/replacement-cost.vo";
import type { Unit } from "./value-objects/unit.vo";

export interface ProductImageData {
  url: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface ProductSpecificationData {
  key: string;
  value: string;
  sortOrder?: number;
}

export interface ProductAttributeValueData {
  attributeId: ProductAttributeId;
  value: string;
}

export type ProductTagIds = ProductTagId[];

export interface ProductImageRecord extends ProductImageData {
  id: string;
}

export interface ProductSpecificationRecord extends ProductSpecificationData {
  id: string;
}

export interface ProductAttributeValueRecord extends ProductAttributeValueData {
  id: string;
}

export interface ProductMetadata {
  tagIds: ProductTagIds;
  images: ProductImageRecord[];
  specifications: ProductSpecificationRecord[];
  attributeValues: ProductAttributeValueRecord[];
  variantCount: number;
}

export interface CreateProductData {
  productCode: ProductCode;
  name: ProductName;
  description?: string | null;
  unit: Unit;
  rentalRate: RentalRate;
  replacementCost?: ReplacementCost | null;
  isActive?: boolean;
  categoryId?: CategoryId | null;
  brandId?: BrandId | null;
  unitId?: UnitOfMeasureId | null;
  tagIds?: ProductTagIds;
  images?: ProductImageData[];
  specifications?: ProductSpecificationData[];
  attributeValues?: ProductAttributeValueData[];
}

export interface UpdateProductData {
  name?: ProductName;
  description?: string | null;
  unit?: Unit;
  rentalRate?: RentalRate;
  replacementCost?: ReplacementCost | null;
  isActive?: boolean;
  categoryId?: CategoryId | null;
  brandId?: BrandId | null;
  unitId?: UnitOfMeasureId | null;
  tagIds?: ProductTagIds;
  images?: ProductImageData[];
  specifications?: ProductSpecificationData[];
  attributeValues?: ProductAttributeValueData[];
}
