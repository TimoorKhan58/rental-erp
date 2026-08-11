import { describe, expect, it } from "vitest";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";

import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { ConfirmRentalOrderService } from "@/modules/rental-order/application/services/confirm-rental-order.service";
import { CreateRentalOrderService } from "@/modules/rental-order/application/services/create-rental-order.service";
import { GetRentalOrderByIdService } from "@/modules/rental-order/application/services/get-rental-order-by-id.service";
import { ListRentalOrdersService } from "@/modules/rental-order/application/services/list-rental-orders.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import { UpdateRentalOrderService } from "@/modules/rental-order/application/services/update-rental-order.service";
import {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
} from "@/modules/rental-order/application/services/rental-order-service.constants";
import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import {
  DISPATCH_ID,
  buildDispatchEntity,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  OTHER_INVENTORY_ID,
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";
import type { CreateRentalOrderInput } from "@/modules/rental-order/application/schemas/rental-order.schemas";

import {
  ITEM_ID,
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
  buildConfirmedRentalOrderEntity,
  buildCreateRentalOrderData,
  buildPartiallyReservedConfirmedEntity,
  buildRentalOrderEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";

function createWriteScope(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
  dispatchRepository: InMemoryDispatchRepository = new InMemoryDispatchRepository(),
) {
  return createPassThroughTransactionRunner({
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    dispatchRepository,
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateRentalOrderInput;

describe("CreateRentalOrderService", () => {
  it("creates a rental order and returns a DTO", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
      createMockNumberSequenceRepository(),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.orderNumber).toBe("RO-2026-001");
    expect(rentalOrderRepository.count()).toBe(1);
  });

  it("rejects duplicate order number", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
      createMockNumberSequenceRepository(),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects invalid input", async () => {
    const service = new CreateRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
      createMockNumberSequenceRepository(),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, items: [] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const service = new CreateRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
      createMockNumberSequenceRepository(),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: RENTAL_ORDER_MODULE,
      entityName: RENTAL_ORDER_ENTITY_NAME,
      action: "CREATE",
    });
  });
});

describe("UpdateRentalOrderService", () => {
  it("updates draft rental order", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { remarks: "Updated remarks" },
    );

    expect(result.remarks).toBe("Updated remarks");
  });

  it("rejects update when not draft", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const service = new UpdateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when rental order does not exist", async () => {
    const service = new UpdateRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ConfirmRentalOrderService", () => {
  it("confirms draft rental order", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const service = new ConfirmRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CONFIRMED");
  });

  it("rejects confirm when not draft", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const service = new ConfirmRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when rental order does not exist", async () => {
    const service = new ConfirmRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("CancelRentalOrderService", () => {
  it("cancels draft rental order without RELEASE", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(0);
  });

  it("cancels confirmed order with zero reservation without RELEASE", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(0);
  });

  it("cancels partially reserved confirmed order and releases exact reserved qty", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "CONFIRMED",
        reservedQuantity: 60,
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 100,
            dailyRate: 150,
            reservedQuantity: 60,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
        ],
      }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 60,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(result.items[0]?.reservedQuantity).toBe(0);
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      0,
    );
    expect(stockMovementRepository.count()).toBe(1);
    const movement = (await stockMovementRepository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    })).items[0];
    expect(movement?.movementType).toBe("RELEASE");
    expect(movement?.quantity).toBe(60);
    expect(movement?.previousQuantity).toBe(60);
    expect(movement?.newQuantity).toBe(0);
    expect(auditLogger.entries.some((entry) => entry.action === "CANCEL")).toBe(
      true,
    );
  });

  it("cancels fully reserved order and releases all reserved quantity", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "RESERVED",
        reservedQuantity: 100,
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 100,
            dailyRate: 150,
            reservedQuantity: 100,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
        ],
      }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 100,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(result.items[0]?.reservedQuantity).toBe(0);
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      0,
    );
    expect(stockMovementRepository.count()).toBe(1);
  });

  it("cancels multi-line reserved order releasing each line", async () => {
    const secondItemId = "dd0e8400-e29b-41d4-a716-446655440099";
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "RESERVED",
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 50,
            dailyRate: 10,
            reservedQuantity: 50,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
          {
            id: secondItemId,
            productId: OTHER_PRODUCT_ID,
            quantity: 30,
            dailyRate: 10,
            reservedQuantity: 30,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
        ],
      }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 50,
      }),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 30,
        reservedQuantity: 30,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(result.items.every((item) => item.reservedQuantity === 0)).toBe(true);
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      0,
    );
    expect(
      (await inventoryRepository.findById(OTHER_INVENTORY_ID))?.reservedQuantity,
    ).toBe(0);
    expect(stockMovementRepository.count()).toBe(2);
  });

  it("rolls back everything when a later RELEASE fails", async () => {
    const secondItemId = "dd0e8400-e29b-41d4-a716-446655440099";
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "RESERVED",
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 50,
            dailyRate: 10,
            reservedQuantity: 50,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
          {
            id: secondItemId,
            productId: OTHER_PRODUCT_ID,
            quantity: 30,
            dailyRate: 10,
            reservedQuantity: 30,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
        ],
      }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 50,
      }),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 30,
        reservedQuantity: 10,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CancelRentalOrderService(
      createRollbackTransactionRunner(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    expect(order?.status).toBe("RESERVED");
    expect(order?.items[0]?.reservedQuantity).toBe(50);
    expect(order?.items[1]?.reservedQuantity).toBe(30);
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      50,
    );
    expect(
      (await inventoryRepository.findById(OTHER_INVENTORY_ID))?.reservedQuantity,
    ).toBe(10);
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries.some((entry) => entry.action === "CANCEL")).toBe(
      false,
    );
  });

  it("fails closed when inventory reserved is below line reserved", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "CONFIRMED",
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 100,
            dailyRate: 150,
            reservedQuantity: 60,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
        ],
      }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 40,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createRollbackTransactionRunner(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
      "CONFIRMED",
    );
    expect(
      (await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.items[0]
        ?.reservedQuantity,
    ).toBe(60);
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      40,
    );
    expect(stockMovementRepository.count()).toBe(0);
  });

  it("cancels successfully when inventory is inactive", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 10,
        isActive: false,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      0,
    );
    expect(stockMovementRepository.count()).toBe(1);
  });

  it("rejects cancel when a non-cancelled dispatch exists", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 10,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildDispatchEntity({ status: "READY" }),
    ]);
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
        dispatchRepository,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toMatchObject({
      name: "UnprocessableError",
      message:
        "Rental order cannot be cancelled because it has an active dispatch",
    });

    expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
      "RESERVED",
    );
    expect(stockMovementRepository.count()).toBe(0);
  });

  it("rejects cancel when order is ON_RENT after physical dispatch", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "ON_RENT",
        reservedQuantity: 10,
      }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 90,
        reservedQuantity: 0,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildDispatchEntity({ status: "COMPLETED" }),
    ]);
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
        dispatchRepository,
      ),
    );

    await expect(service.execute({ id: RENTAL_ORDER_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
      "ON_RENT",
    );
    expect(stockMovementRepository.count()).toBe(0);
    expect(
      (await inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand,
    ).toBe(90);
    expect((await dispatchRepository.findById(DISPATCH_ID))?.status).toBe(
      "COMPLETED",
    );
  });

  it("allows cancel when only cancelled dispatches exist", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 10,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildDispatchEntity({ status: "CANCELLED" }),
    ]);
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
        dispatchRepository,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(1);
  });

  it("rejects duplicate cancel without second RELEASE", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 10,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await service.execute({ id: RENTAL_ORDER_ID });
    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(stockMovementRepository.count()).toBe(1);
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      0,
    );
  });

  it("allows only one concurrent cancel", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "RESERVED",
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 100,
            dailyRate: 150,
            reservedQuantity: 100,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
        ],
      }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 100,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const results = await Promise.allSettled([
      service.execute({ id: RENTAL_ORDER_ID }),
      service.execute({ id: RENTAL_ORDER_ID }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
    expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
      "CANCELLED",
    );
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      0,
    );
    expect(stockMovementRepository.count()).toBe(1);
  });

  it("cancel vs reserve does not produce negative reserved or partial cancel", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 0,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const cancelService = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );
    const reserveService = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const results = await Promise.allSettled([
      cancelService.execute({ id: RENTAL_ORDER_ID }),
      reserveService.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    const inventory = await inventoryRepository.findById(INVENTORY_ID);

    expect(inventory?.reservedQuantity).toBeGreaterThanOrEqual(0);
    if (order?.status === "CANCELLED") {
      expect(order.items.every((item) => item.reservedQuantity === 0)).toBe(true);
      expect(inventory?.reservedQuantity).toBe(0);
    }
    if (order?.status === "CONFIRMED" || order?.status === "RESERVED") {
      expect(order.items[0]?.reservedQuantity).toBeGreaterThan(0);
      expect(inventory?.reservedQuantity).toBe(order.items[0]?.reservedQuantity);
    }
  });
});

describe("ReserveRentalOrderService", () => {
  it("reserves stock and creates RESERVE stock movement", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 0,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );

    expect(result.status).toBe("CONFIRMED");
    expect(result.items[0]?.reservedQuantity).toBe(5);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.reservedQuantity).toBe(5);
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("RESERVE");
    expect(movement?.referenceType).toBe(RENTAL_ORDER_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(RENTAL_ORDER_ID);
  });

  it("marks rental order as reserved when fully reserved", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity({ reservedQuantity: 0 })]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
    );

    expect(result.status).toBe("RESERVED");
  });

  it("rejects reserve when inventory is missing", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects reserve without user context", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects reserve when rental order is draft", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("writes rental order and stock movement audit logs", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );

    expect(
      auditLogger.entries.filter((entry) => entry.action === "UPDATE").length,
    ).toBeGreaterThan(0);
    expect(auditLogger.entries.some((entry) => entry.action === "CREATE")).toBe(
      true,
    );
  });

  it("rolls back reserve changes on failure", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 50, reservedQuantity: 45 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new ReserveRentalOrderService(
      createRollbackTransactionRunner(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    expect(order?.status).toBe("CONFIRMED");
    expect(order?.items[0]?.reservedQuantity).toBe(0);
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetRentalOrderByIdService", () => {
  it("returns rental order by id", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([buildRentalOrderEntity()]);
    const service = new GetRentalOrderByIdService(repository);

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.id).toBe(RENTAL_ORDER_ID);
  });

  it("throws when rental order does not exist", async () => {
    const service = new GetRentalOrderByIdService(
      new InMemoryRentalOrderRepository(),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListRentalOrdersService", () => {
  it("returns paginated rental orders", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([
      buildRentalOrderEntity(),
      buildRentalOrderEntity({
        id: "aa0e8400-e29b-41d4-a716-446655440002" as typeof RENTAL_ORDER_ID,
        status: "CONFIRMED",
      }),
    ]);
    const service = new ListRentalOrdersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([
      buildRentalOrderEntity(),
      buildConfirmedRentalOrderEntity(),
    ]);
    const service = new ListRentalOrdersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "CONFIRMED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("CONFIRMED");
  });
});

describe("CreateRentalOrderService domain validation", () => {
  it("rejects duplicate products before persistence", async () => {
    const service = new CreateRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
      createMockNumberSequenceRepository(),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        items: [
          { productId: PRODUCT_ID, quantity: 10, dailyRate: 10 },
          { productId: PRODUCT_ID, quantity: 5, dailyRate: 12 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("ReserveRentalOrderService inventory state", () => {
  it("rejects reserve when inventory is inactive", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ isActive: false }),
    ]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("supports second partial reserve on same rental order", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildPartiallyReservedConfirmedEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 4 }),
    ]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 6 }] },
    );

    expect(result.items[0]?.reservedQuantity).toBe(10);
    expect(result.status).toBe("RESERVED");
  });

  it("rolls back all inventory and order changes when a later line lacks capacity", async () => {
    const created = RentalOrder.create(
      buildCreateRentalOrderData({
        items: [
          { productId: PRODUCT_ID, quantity: 50, dailyRate: 10 },
          { productId: OTHER_PRODUCT_ID, quantity: 50, dailyRate: 10 },
        ],
      }),
    );
    const multiItemOrder = RentalOrder.reconstitute({
      id: RENTAL_ORDER_ID,
      orderNumber: created.orderNumber,
      customerId: created.customerId,
      warehouseId: created.warehouseId,
      status: "CONFIRMED",
      startDate: created.startDate,
      endDate: created.endDate,
      remarks: created.remarks,
      items: created.items.map((item, index) => ({
        ...item,
        id:
          index === 0
            ? ITEM_ID
            : "dd0e8400-e29b-41d4-a716-446655440099",
        reservedQuantity: 0,
      })),
      createdById: created.createdById,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      updatedAt: new Date("2026-01-15T10:00:00.000Z"),
    });

    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([multiItemOrder]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        quantityOnHand: 100,
        reservedQuantity: 0,
      }),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 20,
        reservedQuantity: 0,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new ReserveRentalOrderService(
      createRollbackTransactionRunner(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        {
          items: [
            { productId: PRODUCT_ID, quantity: 50 },
            { productId: OTHER_PRODUCT_ID, quantity: 50 },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    expect(order?.status).toBe("CONFIRMED");
    expect(order?.items.every((item) => item.reservedQuantity === 0)).toBe(
      true,
    );
    expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      0,
    );
    expect(
      (await inventoryRepository.findById(OTHER_INVENTORY_ID))?.reservedQuantity,
    ).toBe(0);
    expect(stockMovementRepository.count()).toBe(0);
  });

  it("applies multi-item inventory reserves in deterministic inventory-id order", async () => {
    const created = RentalOrder.create(
      buildCreateRentalOrderData({
        items: [
          { productId: PRODUCT_ID, quantity: 5, dailyRate: 10 },
          { productId: OTHER_PRODUCT_ID, quantity: 5, dailyRate: 10 },
        ],
      }),
    );
    const multiItemOrder = RentalOrder.reconstitute({
      id: RENTAL_ORDER_ID,
      orderNumber: created.orderNumber,
      customerId: created.customerId,
      warehouseId: created.warehouseId,
      status: "CONFIRMED",
      startDate: created.startDate,
      endDate: created.endDate,
      remarks: created.remarks,
      items: created.items.map((item, index) => ({
        ...item,
        id:
          index === 0
            ? ITEM_ID
            : "dd0e8400-e29b-41d4-a716-446655440099",
        reservedQuantity: 0,
      })),
      createdById: created.createdById,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      updatedAt: new Date("2026-01-15T10:00:00.000Z"),
    });

    // OTHER_INVENTORY_ID > INVENTORY_ID lexicographically (...440001 > ...440000)
    // Request items intentionally put the higher id product first.
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([multiItemOrder]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        quantityOnHand: 100,
        reservedQuantity: 0,
      }),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 0,
      }),
    ]);

    const reserveOrder: string[] = [];
    const originalReserve = inventoryRepository.reserveAvailableQuantity.bind(
      inventoryRepository,
    );
    inventoryRepository.reserveAvailableQuantity = async (id, quantity) => {
      reserveOrder.push(id);
      return originalReserve(id, quantity);
    };

    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await service.execute(
      { id: RENTAL_ORDER_ID },
      {
        items: [
          { productId: OTHER_PRODUCT_ID, quantity: 5 },
          { productId: PRODUCT_ID, quantity: 5 },
        ],
      },
    );

    expect(reserveOrder).toEqual([INVENTORY_ID, OTHER_INVENTORY_ID]);
  });
});
