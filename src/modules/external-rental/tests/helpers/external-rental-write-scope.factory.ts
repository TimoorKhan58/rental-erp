import type { ExternalRentalWriteScope } from "@/modules/external-rental/application/services/external-rental-transaction.runner";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { ProductId, RentalOrderId, WarehouseId } from "@/shared/domain/ids";

import {
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  RENTAL_ORDER_ITEM_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "./external-rental.fixtures";
import type { InMemoryExternalRentalRepository } from "./in-memory-external-rental.repository";
import { MockAuditLogger } from "./mock-audit-logger";
import { createPassThroughExternalRentalTransactionRunner } from "./transaction-test-runner";

export function createExternalRentalWriteScope(
  scope: Pick<ExternalRentalWriteScope, "externalRentalRepository" | "auditLogger"> &
    Partial<Omit<ExternalRentalWriteScope, "externalRentalRepository" | "auditLogger">>,
): ExternalRentalWriteScope {
  return {
    rentalOrderRepository:
      scope.rentalOrderRepository ?? new InMemoryRentalOrderRepository(),
    inventoryRepository:
      scope.inventoryRepository ?? new InMemoryInventoryRepository(),
    userId: scope.userId,
    externalRentalRepository: scope.externalRentalRepository,
    auditLogger: scope.auditLogger,
  };
}

export function createShortfallBackedExternalRentalHarness(
  externalRentals: InMemoryExternalRentalRepository,
  options: {
    rentalOrderId?: RentalOrderId;
    rentalOrderItemId?: string;
    productId?: ProductId;
    warehouseId?: WarehouseId;
    orderQuantity?: number;
    onHand?: number;
    userId?: string;
  } = {},
) {
  const rentalOrderId = options.rentalOrderId ?? RENTAL_ORDER_ID;
  const rentalOrderItemId = options.rentalOrderItemId ?? RENTAL_ORDER_ITEM_ID;
  const productId = options.productId ?? PRODUCT_ID;
  const warehouseId = options.warehouseId ?? WAREHOUSE_ID;
  const orderQuantity = options.orderQuantity ?? 500;
  const onHand = options.onHand ?? 300;
  const userId = options.userId ?? USER_ID;

  const rentalOrders = new InMemoryRentalOrderRepository();
  rentalOrders.seed([
    buildRentalOrderEntity({
      id: rentalOrderId as never,
      status: "CONFIRMED",
      warehouseId,
      items: [
        {
          id: rentalOrderItemId,
          productId,
          quantity: orderQuantity,
          dailyRate: 10,
          reservedQuantity: 0,
          startDate: new Date("2026-02-01T00:00:00.000Z"),
          endDate: new Date("2026-02-05T00:00:00.000Z"),
          numberOfDays: 5,
        },
      ],
    }),
  ]);

  const inventory = new InMemoryInventoryRepository();
  inventory.seed([
    buildInventoryEntity({
      quantityOnHand: onHand,
      reservedQuantity: 0,
      productId,
      warehouseId,
    }),
  ]);

  const auditLogger = new MockAuditLogger();
  const runner = createPassThroughExternalRentalTransactionRunner({
    externalRentalRepository: externalRentals,
    rentalOrderRepository: rentalOrders,
    inventoryRepository: inventory,
    auditLogger,
    userId,
  });

  return { rentalOrders, inventory, auditLogger, runner };
}
