import type { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type { StockMovementType } from "@/modules/stock-movement/domain/stock-movement.constants";
import { StockMovementInsufficientQuantityError } from "@/modules/stock-movement/domain/stock-movement.errors";

export interface MovementEffect {
  quantityOnHand: number;
  reservedQuantity: number;
  previousQuantity: number;
  newQuantity: number;
}

export function computeMovementEffect(
  inventory: Inventory,
  movementType: StockMovementType,
  quantity: number,
): MovementEffect {
  const props = inventory.toProps();

  switch (movementType) {
    case "IN": {
      const previousQuantity = props.quantityOnHand;
      const newQuantity = previousQuantity + quantity;

      return {
        quantityOnHand: newQuantity,
        reservedQuantity: props.reservedQuantity,
        previousQuantity,
        newQuantity,
      };
    }
    case "OUT": {
      if (props.quantityOnHand < quantity) {
        throw new StockMovementInsufficientQuantityError(
          "Insufficient quantity on hand for OUT movement",
          movementType,
          quantity,
          props.quantityOnHand,
        );
      }

      const previousQuantity = props.quantityOnHand;
      const newQuantity = previousQuantity - quantity;

      return {
        quantityOnHand: newQuantity,
        reservedQuantity: props.reservedQuantity,
        previousQuantity,
        newQuantity,
      };
    }
    case "RESERVE": {
      if (inventory.availableQuantity < quantity) {
        throw new StockMovementInsufficientQuantityError(
          "Insufficient available quantity for RESERVE movement",
          movementType,
          quantity,
          inventory.availableQuantity,
        );
      }

      const previousQuantity = props.reservedQuantity;
      const newQuantity = previousQuantity + quantity;

      return {
        quantityOnHand: props.quantityOnHand,
        reservedQuantity: newQuantity,
        previousQuantity,
        newQuantity,
      };
    }
    case "RELEASE": {
      if (props.reservedQuantity < quantity) {
        throw new StockMovementInsufficientQuantityError(
          "Insufficient reserved quantity for RELEASE movement",
          movementType,
          quantity,
          props.reservedQuantity,
        );
      }

      const previousQuantity = props.reservedQuantity;
      const newQuantity = previousQuantity - quantity;

      return {
        quantityOnHand: props.quantityOnHand,
        reservedQuantity: newQuantity,
        previousQuantity,
        newQuantity,
      };
    }
    case "ADJUSTMENT": {
      const previousQuantity = props.quantityOnHand;
      const newQuantity = previousQuantity + quantity;

      if (newQuantity < 0) {
        throw new StockMovementInsufficientQuantityError(
          "Adjustment would result in negative quantity on hand",
          movementType,
          quantity,
          props.quantityOnHand,
        );
      }

      if (newQuantity < props.reservedQuantity) {
        throw new StockMovementInsufficientQuantityError(
          "Adjustment would leave on-hand below reserved quantity",
          movementType,
          quantity,
          props.quantityOnHand - props.reservedQuantity,
        );
      }

      return {
        quantityOnHand: newQuantity,
        reservedQuantity: props.reservedQuantity,
        previousQuantity,
        newQuantity,
      };
    }
    default: {
      const exhaustiveCheck: never = movementType;
      throw new Error(`Unsupported movement type: ${exhaustiveCheck}`);
    }
  }
}
