import { describe, expect, it } from "vitest";

import { buildReservedRentalOrderEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { REPAIR_REFERENCE_TYPE } from "@/modules/repair/domain";
import { CancelRepairService } from "@/modules/repair/application/services/cancel-repair.service";
import { CompleteRepairService } from "@/modules/repair/application/services/complete-repair.service";
import { CreateRepairService } from "@/modules/repair/application/services/create-repair.service";
import { GetRepairByIdService } from "@/modules/repair/application/services/get-repair-by-id.service";
import { ListRepairsService } from "@/modules/repair/application/services/list-repairs.service";
import { StartRepairService } from "@/modules/repair/application/services/start-repair.service";
import { UpdateRepairService } from "@/modules/repair/application/services/update-repair.service";
import {
  REPAIR_ENTITY_NAME,
  REPAIR_MODULE,
} from "@/modules/repair/application/services/repair-service.constants";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { buildReceivedReturnEntity } from "@/modules/return/tests/helpers/return.fixtures";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
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
import type { CreateRepairInput } from "@/modules/repair/application/schemas/repair.schemas";

import {
  OTHER_REPAIR_ID,
  REPAIR_ID,
  VALID_CREATE_INPUT,
  buildCompletedReturnForRepair,
  buildCompletedRepairEntity,
  buildInProgressRepairEntity,
  buildRepairEntity,
} from "../tests/helpers/repair.fixtures";
import { InMemoryRepairRepository } from "../tests/helpers/in-memory-repair.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  repairRepository: InMemoryRepairRepository,
  returnRepository: InMemoryReturnRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    repairRepository,
    returnRepository,
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateRepairInput;

describe("CreateRepairService", () => {
  it("creates a repair and returns a DTO", async () => {
    const repairRepository = new InMemoryRepairRepository();
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateRepairService(
      createWriteScope(
        repairRepository,
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.repairNumber).toBe("RPR-2026-001");
    expect(repairRepository.count()).toBe(1);
  });

  it("rejects duplicate repair number", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({ status: "CANCELLED" }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        repairRepository,
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects invalid input", async () => {
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, quantity: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: REPAIR_MODULE,
      entityName: REPAIR_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rejects when return does not exist", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        new InMemoryReturnRepository(),
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects when return is not completed", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReceivedReturnEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("rejects without user context", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects quantity exceeding damaged amount", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForRepair({ damagedQuantity: 1 }),
    ]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, quantity: 2 }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects product mismatch", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        productId: "880e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects warehouse mismatch", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        warehouseId: "880e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects when return item does not exist", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        returnItemId: "dd0e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when rental order does not exist", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("UpdateRepairService", () => {
  it("updates pending repair", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const service = new UpdateRepairService(
      createWriteScope(
        repairRepository,
        returnRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: REPAIR_ID },
      { repairNotes: "Updated notes" },
    );

    expect(result.repairNotes).toBe("Updated notes");
  });

  it("rejects update when not pending", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const service = new UpdateRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: REPAIR_ID }, { repairNotes: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when repair does not exist", async () => {
    const service = new UpdateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: REPAIR_ID }, { repairNotes: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on update", async () => {
    const auditLogger = new MockAuditLogger();
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const service = new UpdateRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: REPAIR_ID }, { repairNotes: "Updated" });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });

  it("rejects quantity exceeding remaining damaged on update", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity({ quantity: 1 })]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForRepair({ damagedQuantity: 1 }),
    ]);
    const service = new UpdateRepairService(
      createWriteScope(
        repairRepository,
        returnRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: REPAIR_ID }, { quantity: 2 }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("StartRepairService", () => {
  it("starts pending repair", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const service = new StartRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: REPAIR_ID });

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.startedAt).not.toBeNull();
  });

  it("rejects start when not pending", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const service = new StartRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("throws when repair does not exist", async () => {
    const service = new StartRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("writes audit log on start", async () => {
    const auditLogger = new MockAuditLogger();
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const service = new StartRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: REPAIR_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });
});

describe("CompleteRepairService", () => {
  it("completes in-progress repair with IN stock movement for REPAIR reference", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 45,
        reservedQuantity: 5,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CompleteRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute({ id: REPAIR_ID });

    expect(result.status).toBe("COMPLETED");
    expect(result.completedAt).not.toBeNull();
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("IN");
    expect(movement?.quantity).toBe(1);
    expect(movement?.referenceType).toBe(REPAIR_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(REPAIR_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(46);
  });

  it("rejects complete when not in progress", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const service = new CompleteRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("rejects complete when inventory is missing", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const service = new CompleteRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects complete without user context", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new CompleteRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("writes repair audit log on complete", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CompleteRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: REPAIR_ID });

    expect(
      auditLogger.entries.filter(
        (entry) => entry.module === REPAIR_MODULE && entry.action === "UPDATE",
      ),
    ).toHaveLength(1);
  });

  it("rolls back complete changes on failure", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const returnRepository = new InMemoryReturnRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ isActive: false }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new CompleteRepairService(
      createRollbackTransactionRunner(
        repairRepository,
        returnRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const repair = await repairRepository.findById(REPAIR_ID);
    expect(repair?.status).toBe("IN_PROGRESS");
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("CancelRepairService", () => {
  it("cancels pending repair", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const service = new CancelRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: REPAIR_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("cancels in-progress repair", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const service = new CancelRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: REPAIR_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("rejects cancel when completed", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildCompletedRepairEntity()]);
    const service = new CancelRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("throws when repair does not exist", async () => {
    const service = new CancelRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("writes audit log on cancel", async () => {
    const auditLogger = new MockAuditLogger();
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const service = new CancelRepairService(
      createWriteScope(
        repairRepository,
        new InMemoryReturnRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: REPAIR_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CANCEL");
  });
});

describe("GetRepairByIdService", () => {
  it("returns repair by id", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([buildRepairEntity()]);
    const service = new GetRepairByIdService(repository);

    const result = await service.execute({ id: REPAIR_ID });

    expect(result.id).toBe(REPAIR_ID);
  });

  it("throws when repair does not exist", async () => {
    const service = new GetRepairByIdService(new InMemoryRepairRepository());

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListRepairsService", () => {
  it("returns paginated repairs", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([
      buildRepairEntity(),
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        status: "IN_PROGRESS",
      }),
    ]);
    const service = new ListRepairsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([
      buildRepairEntity(),
      buildInProgressRepairEntity(),
    ]);
    const service = new ListRepairsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "IN_PROGRESS",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("IN_PROGRESS");
  });
});

describe("CreateRepairService prior repair aggregation", () => {
  it("rejects when prior repairs exceed remaining damaged quantity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        status: "PENDING",
        quantity: 1,
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForRepair({ damagedQuantity: 1 }),
    ]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        repairRepository,
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        repairNumber: "RPR-2026-002",
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("accepts repair within remaining damaged quantity", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        status: "PENDING",
        quantity: 1,
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForRepair({ damagedQuantity: 2 }),
    ]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        repairRepository,
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({
      ...VALID_CREATE_SERVICE_INPUT,
      repairNumber: "RPR-2026-002",
      quantity: 1,
    });

    expect(result.status).toBe("PENDING");
    expect(repairRepository.count()).toBe(2);
  });

  it("ignores cancelled prior repairs in quantity aggregation", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        status: "CANCELLED",
        quantity: 2,
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForRepair({ damagedQuantity: 2 }),
    ]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        repairRepository,
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({
      ...VALID_CREATE_SERVICE_INPUT,
      repairNumber: "RPR-2026-002",
    });

    expect(result.status).toBe("PENDING");
  });
});

describe("CreateRepairService domain validation", () => {
  it("rejects zero quantity before persistence", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnForRepair()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, quantity: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when return has no damaged quantity", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForRepair({ damagedQuantity: 0 }),
    ]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateRepairService(
      createWriteScope(
        new InMemoryRepairRepository(),
        returnRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });
});
