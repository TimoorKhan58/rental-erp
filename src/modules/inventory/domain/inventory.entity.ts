import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import { InventoryInvariantError } from "./inventory.errors";
import type { CreateInventoryData } from "./inventory.types";

export interface InventoryProps {
  id: InventoryId;
  productId: ProductId;
  warehouseId: WarehouseId;
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InventoryPropsWithAvailable = InventoryProps & {
  availableQuantity: number;
};

export class Inventory implements Entity<InventoryId> {
  readonly id: InventoryId;
  readonly productId: ProductId;
  readonly warehouseId: WarehouseId;
  readonly quantityOnHand: number;
  readonly reservedQuantity: number;
  readonly minimumStock: number;
  readonly maximumStock: number | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: InventoryProps) {
    this.id = props.id;
    this.productId = props.productId;
    this.warehouseId = props.warehouseId;
    this.quantityOnHand = props.quantityOnHand;
    this.reservedQuantity = props.reservedQuantity;
    this.minimumStock = props.minimumStock;
    this.maximumStock = props.maximumStock;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get availableQuantity(): number {
    return this.quantityOnHand - this.reservedQuantity;
  }

  static create(
    data: CreateInventoryData,
  ): Omit<InventoryProps, "id" | "createdAt" | "updatedAt"> {
    const quantityOnHand = data.quantityOnHand;
    const reservedQuantity = data.reservedQuantity ?? 0;
    const minimumStock = data.minimumStock ?? 0;
    const maximumStock = normalizeMaximumStock(data.maximumStock);

    validateQuantities({
      quantityOnHand,
      reservedQuantity,
      minimumStock,
      maximumStock,
    });

    return {
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantityOnHand,
      reservedQuantity,
      minimumStock,
      maximumStock,
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: InventoryProps): Inventory {
    validateQuantities({
      quantityOnHand: props.quantityOnHand,
      reservedQuantity: props.reservedQuantity,
      minimumStock: props.minimumStock,
      maximumStock: props.maximumStock,
    });

    return new Inventory(props);
  }

  toProps(): InventoryPropsWithAvailable {
    return {
      id: this.id,
      productId: this.productId,
      warehouseId: this.warehouseId,
      quantityOnHand: this.quantityOnHand,
      reservedQuantity: this.reservedQuantity,
      availableQuantity: this.availableQuantity,
      minimumStock: this.minimumStock,
      maximumStock: this.maximumStock,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

interface QuantityValidationInput {
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
}

function validateQuantities(input: QuantityValidationInput): void {
  if (input.quantityOnHand < 0) {
    throw new InventoryInvariantError(
      "quantityOnHand must be non-negative",
      "quantityOnHand",
    );
  }

  if (input.reservedQuantity < 0) {
    throw new InventoryInvariantError(
      "reservedQuantity must be non-negative",
      "reservedQuantity",
    );
  }

  if (input.reservedQuantity > input.quantityOnHand) {
    throw new InventoryInvariantError(
      "reservedQuantity must not exceed quantityOnHand",
      "reservedQuantity",
    );
  }

  if (input.minimumStock < 0) {
    throw new InventoryInvariantError(
      "minimumStock must be non-negative",
      "minimumStock",
    );
  }

  if (
    input.maximumStock !== null &&
    input.maximumStock < input.minimumStock
  ) {
    throw new InventoryInvariantError(
      "maximumStock must be greater than or equal to minimumStock",
      "maximumStock",
    );
  }
}

function normalizeMaximumStock(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value;
}
