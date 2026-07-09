import { describe, expect, it, vi } from "vitest";

import { CreateInventoryService } from "@/modules/inventory/application/services/create-inventory.service";
import { DeleteInventoryService } from "@/modules/inventory/application/services/delete-inventory.service";
import { GetInventoryByIdService } from "@/modules/inventory/application/services/get-inventory-by-id.service";
import { ListInventoryService } from "@/modules/inventory/application/services/list-inventory.service";
import { UpdateInventoryService } from "@/modules/inventory/application/services/update-inventory.service";
import {
  INVENTORY_ENTITY_NAME,
  INVENTORY_MODULE,
} from "@/modules/inventory/application/services/inventory-service.constants";
import { InventoryInvariantError } from "@/modules/inventory/domain/inventory.errors";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";
import { ValidationError } from "@/shared/infrastructure/errors";

import {
  INVENTORY_ID,
  OTHER_INVENTORY_ID,
  OTHER_PRODUCT_ID,
  OTHER_WAREHOUSE_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
  buildInventoryEntity,
} from "../tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "../tests/helpers/in-memory-inventory.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

describe("CreateInventoryService", () => {
  it("creates inventory and returns a DTO with availableQuantity", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.quantityOnHand).toBe(100);
    expect(result.reservedQuantity).toBe(10);
    expect(result.availableQuantity).toBe(90);
    expect(repository.count()).toBe(1);
  });

  it("creates inventory with default optional quantities", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute({
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 50,
    });

    expect(result.reservedQuantity).toBe(0);
    expect(result.minimumStock).toBe(0);
    expect(result.maximumStock).toBeNull();
    expect(result.availableQuantity).toBe(50);
  });

  it("rejects duplicate product and warehouse combination", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects invalid productId", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, productId: "bad-id" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects negative quantityOnHand via domain validation", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, quantityOnHand: -1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("UpdateInventoryService", () => {
  it("updates an existing inventory record", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: INVENTORY_ID },
      { quantityOnHand: 200 },
    );

    expect(result.quantityOnHand).toBe(200);
    expect(result.availableQuantity).toBe(190);
  });

  it("throws when inventory does not exist", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new UpdateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: INVENTORY_ID }, { quantityOnHand: 200 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("re-validates reserved quantity against updated on-hand", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: INVENTORY_ID }, { quantityOnHand: 5 }),
    ).rejects.toBeInstanceOf(InventoryInvariantError);
  });

  it("updates reserved quantity", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: INVENTORY_ID },
      { reservedQuantity: 20 },
    );

    expect(result.reservedQuantity).toBe(20);
    expect(result.availableQuantity).toBe(80);
  });

  it("clears maximumStock when set to null", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: INVENTORY_ID },
      { maximumStock: null },
    );

    expect(result.maximumStock).toBeNull();
  });
});

describe("DeleteInventoryService", () => {
  it("deletes an existing inventory record", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: INVENTORY_ID });

    expect(repository.count()).toBe(0);
  });

  it("throws when inventory does not exist", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new DeleteInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute({ id: INVENTORY_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetInventoryByIdService", () => {
  it("returns inventory DTO with availableQuantity", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const service = new GetInventoryByIdService(repository);

    const result = await service.execute({ id: INVENTORY_ID });

    expect(result.id).toBe(INVENTORY_ID);
    expect(result.availableQuantity).toBe(90);
  });

  it("throws NotFoundError for missing inventory", async () => {
    const service = new GetInventoryByIdService(new InMemoryInventoryRepository());

    await expect(service.execute({ id: INVENTORY_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListInventoryService", () => {
  it("returns paginated DTOs", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity(),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 0,
      }),
    ]);
    const service = new ListInventoryService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 1,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(2);
  });

  it("filters by productId", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity(),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
      }),
    ]);
    const service = new ListInventoryService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      productId: PRODUCT_ID,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productId).toBe(PRODUCT_ID);
  });

  it("filters by warehouseId", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity(),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
      }),
    ]);
    const service = new ListInventoryService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      warehouseId: WAREHOUSE_ID,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.warehouseId).toBe(WAREHOUSE_ID);
  });
});

describe("Inventory application audit behavior", () => {
  it("writes CREATE audit on success", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
    expect(auditLogger.entries[0]?.module).toBe(INVENTORY_MODULE);
    expect(auditLogger.entries[0]?.entityName).toBe(INVENTORY_ENTITY_NAME);
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      availableQuantity: 90,
    });
  });

  it("writes UPDATE audit with old and new values", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: INVENTORY_ID }, { quantityOnHand: 200 });

    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.oldValues).toMatchObject({
      quantityOnHand: 100,
      availableQuantity: 90,
    });
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      quantityOnHand: 200,
      availableQuantity: 190,
    });
  });

  it("writes DELETE audit on success", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: INVENTORY_ID });

    expect(auditLogger.entries[0]?.action).toBe("DELETE");
  });

  it("does not write audit when create fails validation", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, productId: "bad-id" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("Inventory application transaction behavior", () => {
  it("commits successful writes", async () => {
    const repository = new InMemoryInventoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rolls back data and audit when unique constraint fails", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateInventoryService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("rolls back delete when audit logging fails", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    auditLogger.log = vi.fn(async () => {
      throw new Error("audit failed");
    });
    const service = new DeleteInventoryService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: INVENTORY_ID })).rejects.toThrow(
      "audit failed",
    );

    expect(repository.count()).toBe(1);
  });
});
