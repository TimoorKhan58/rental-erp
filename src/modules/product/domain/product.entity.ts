import type { ProductId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { CreateProductData } from "./product.types";
import type { ProductCode } from "./value-objects/product-code.vo";
import type { ProductName } from "./value-objects/product-name.vo";
import type { RentalRate } from "./value-objects/rental-rate.vo";
import type { ReplacementCost } from "./value-objects/replacement-cost.vo";
import type { Unit } from "./value-objects/unit.vo";
import { createProductCode } from "./value-objects/product-code.vo";
import { createProductName } from "./value-objects/product-name.vo";
import { createRentalRate } from "./value-objects/rental-rate.vo";
import { createReplacementCost } from "./value-objects/replacement-cost.vo";
import { createUnit } from "./value-objects/unit.vo";

export interface ProductProps {
  id: ProductId;
  productCode: ProductCode;
  name: ProductName;
  description: string | null;
  unit: Unit;
  rentalRate: RentalRate;
  replacementCost: ReplacementCost | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Product implements Entity<ProductId> {
  readonly id: ProductId;
  readonly productCode: ProductCode;
  readonly name: ProductName;
  readonly description: string | null;
  readonly unit: Unit;
  readonly rentalRate: RentalRate;
  readonly replacementCost: ReplacementCost | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProductProps) {
    this.id = props.id;
    this.productCode = props.productCode;
    this.name = props.name;
    this.description = props.description;
    this.unit = props.unit;
    this.rentalRate = props.rentalRate;
    this.replacementCost = props.replacementCost;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateProductData,
  ): Omit<ProductProps, "id" | "createdAt" | "updatedAt"> {
    return {
      productCode: data.productCode,
      name: data.name,
      description: normalizeOptionalText(data.description),
      unit: data.unit,
      rentalRate: data.rentalRate,
      replacementCost: data.replacementCost ?? null,
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: ProductProps): Product {
    return new Product({
      id: props.id,
      productCode: createProductCode(props.productCode),
      name: createProductName(props.name),
      description: normalizeOptionalText(props.description),
      unit: createUnit(props.unit),
      rentalRate: createRentalRate(props.rentalRate),
      replacementCost: createReplacementCost(props.replacementCost),
      isActive: props.isActive,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  toProps(): ProductProps {
    return {
      id: this.id,
      productCode: this.productCode,
      name: this.name,
      description: this.description,
      unit: this.unit,
      rentalRate: this.rentalRate,
      replacementCost: this.replacementCost,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
