import type {
  InventoryId,
  ProductId,
  StockMovementId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { StockMovementType } from "./stock-movement.constants";
import { StockMovementInvariantError } from "./stock-movement.errors";
import type {
  CreateStockMovementData,
  StockMovementProps,
} from "./stock-movement.types";

export class StockMovement {
  readonly id: StockMovementId;
  readonly inventoryId: InventoryId;
  readonly productId: ProductId;
  readonly warehouseId: WarehouseId;
  readonly movementType: StockMovementType;
  readonly quantity: number;
  readonly previousQuantity: number;
  readonly newQuantity: number;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly remarks: string;
  readonly createdAt: Date;
  readonly createdById: UserId;

  private constructor(props: StockMovementProps) {
    this.id = props.id;
    this.inventoryId = props.inventoryId;
    this.productId = props.productId;
    this.warehouseId = props.warehouseId;
    this.movementType = props.movementType;
    this.quantity = props.quantity;
    this.previousQuantity = props.previousQuantity;
    this.newQuantity = props.newQuantity;
    this.referenceType = props.referenceType;
    this.referenceId = props.referenceId;
    this.remarks = props.remarks;
    this.createdAt = props.createdAt;
    this.createdById = props.createdById;
  }

  static create(
    data: CreateStockMovementData,
  ): Omit<StockMovementProps, "id" | "createdAt"> {
    validateStockMovement({
      movementType: data.movementType,
      quantity: data.quantity,
      previousQuantity: data.previousQuantity,
      newQuantity: data.newQuantity,
    });

    return {
      inventoryId: data.inventoryId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      movementType: data.movementType,
      quantity: data.quantity,
      previousQuantity: data.previousQuantity,
      newQuantity: data.newQuantity,
      referenceType: data.referenceType ?? null,
      referenceId: data.referenceId ?? null,
      remarks: data.remarks ?? "",
      createdById: data.createdById,
    };
  }

  static reconstitute(props: StockMovementProps): StockMovement {
    validateStockMovement({
      movementType: props.movementType,
      quantity: props.quantity,
      previousQuantity: props.previousQuantity,
      newQuantity: props.newQuantity,
    });

    return new StockMovement(props);
  }

  toProps(): StockMovementProps {
    return {
      id: this.id,
      inventoryId: this.inventoryId,
      productId: this.productId,
      warehouseId: this.warehouseId,
      movementType: this.movementType,
      quantity: this.quantity,
      previousQuantity: this.previousQuantity,
      newQuantity: this.newQuantity,
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      remarks: this.remarks,
      createdAt: this.createdAt,
      createdById: this.createdById,
    };
  }
}

interface StockMovementValidationInput {
  movementType: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
}

function validateStockMovement(input: StockMovementValidationInput): void {
  if (!input.movementType) {
    throw new StockMovementInvariantError(
      "movementType is required",
      "movementType",
    );
  }

  if (input.quantity <= 0) {
    throw new StockMovementInvariantError(
      "quantity must be greater than zero",
      "quantity",
    );
  }

  if (input.previousQuantity < 0) {
    throw new StockMovementInvariantError(
      "previousQuantity must be non-negative",
      "previousQuantity",
    );
  }

  if (input.newQuantity < 0) {
    throw new StockMovementInvariantError(
      "newQuantity must be non-negative",
      "newQuantity",
    );
  }
}
