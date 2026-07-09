import { describe, expect, it, vi } from "vitest";

import { CreateWarehouseService } from "@/modules/warehouse/application/services/create-warehouse.service";
import { DeleteWarehouseService } from "@/modules/warehouse/application/services/delete-warehouse.service";
import { GetWarehouseByIdService } from "@/modules/warehouse/application/services/get-warehouse-by-id.service";
import { ListWarehousesService } from "@/modules/warehouse/application/services/list-warehouses.service";
import { UpdateWarehouseService } from "@/modules/warehouse/application/services/update-warehouse.service";
import {
  WAREHOUSE_ENTITY_NAME,
  WAREHOUSE_MODULE,
} from "@/modules/warehouse/application/services/warehouse-service.constants";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";
import { ValidationError } from "@/shared/infrastructure/errors";

import {
  WAREHOUSE_ID,
  OTHER_WAREHOUSE_ID,
  VALID_CREATE_INPUT,
  buildWarehouseEntity,
} from "../tests/helpers/warehouse.fixtures";
import {
  createPhoneNumber,
  createWarehouseCode,
} from "@/modules/warehouse/domain";
import { InMemoryWarehouseRepository } from "../tests/helpers/in-memory-warehouse.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

describe("CreateWarehouseService", () => {
  it("creates a warehouse and returns a DTO", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.warehouseCode).toBe("WH-001");
    expect(repository.count()).toBe(1);
  });

  it("creates a warehouse without optional phone", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const inputWithoutPhone = {
      warehouseCode: VALID_CREATE_INPUT.warehouseCode,
      name: VALID_CREATE_INPUT.name,
      description: VALID_CREATE_INPUT.description,
      address: VALID_CREATE_INPUT.address,
      contactPerson: VALID_CREATE_INPUT.contactPerson,
      isActive: VALID_CREATE_INPUT.isActive,
    };
    const result = await service.execute(inputWithoutPhone);

    expect(result.phone).toBeNull();
    expect(repository.count()).toBe(1);
  });

  it("rejects duplicate warehouse code", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("allows duplicate phone numbers", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute({
      ...VALID_CREATE_INPUT,
      warehouseCode: "WH-002",
    });

    expect(result.warehouseCode).toBe("WH-002");
    expect(repository.count()).toBe(2);
  });

  it("rejects invalid input", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, phone: "bad" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("UpdateWarehouseService", () => {
  it("updates an existing warehouse", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: WAREHOUSE_ID },
      { name: "Updated Name" },
    );

    expect(result.name).toBe("Updated Name");
  });

  it("throws when warehouse does not exist", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new UpdateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: WAREHOUSE_ID }, { name: "Updated Name" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows updating phone to an existing phone on another warehouse", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([
      buildWarehouseEntity(),
      buildWarehouseEntity({
        id: OTHER_WAREHOUSE_ID,
        warehouseCode: createWarehouseCode("WH-002"),
        phone: createPhoneNumber("+923009999999"),
      }),
    ]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: WAREHOUSE_ID },
      { phone: "+923009999999" },
    );

    expect(result.phone).toBe("+923009999999");
  });
});

describe("DeleteWarehouseService", () => {
  it("deletes an existing warehouse", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: WAREHOUSE_ID });

    expect(repository.count()).toBe(0);
  });

  it("throws when warehouse does not exist", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new DeleteWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute({ id: WAREHOUSE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetWarehouseByIdService", () => {
  it("returns warehouse DTO", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const service = new GetWarehouseByIdService(repository);

    const result = await service.execute({ id: WAREHOUSE_ID });

    expect(result.id).toBe(WAREHOUSE_ID);
  });

  it("throws NotFoundError for missing warehouse", async () => {
    const service = new GetWarehouseByIdService(new InMemoryWarehouseRepository());

    await expect(service.execute({ id: WAREHOUSE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListWarehousesService", () => {
  it("returns paginated DTOs", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([
      buildWarehouseEntity(),
      buildWarehouseEntity({
        id: OTHER_WAREHOUSE_ID,
        warehouseCode: createWarehouseCode("WH-002"),
        phone: createPhoneNumber("+923009999999"),
        name: "Second Warehouse",
      }),
    ]);
    const service = new ListWarehousesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 1,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(2);
  });
});

describe("Warehouse application audit behavior", () => {
  it("writes CREATE audit on success", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
    expect(auditLogger.entries[0]?.module).toBe(WAREHOUSE_MODULE);
    expect(auditLogger.entries[0]?.entityName).toBe(WAREHOUSE_ENTITY_NAME);
  });

  it("writes UPDATE audit with old and new values", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: WAREHOUSE_ID }, { name: "Updated Name" });

    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.oldValues).toMatchObject({
      name: "Main Storage Hub",
    });
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      name: "Updated Name",
    });
  });

  it("writes DELETE audit on success", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: WAREHOUSE_ID });

    expect(auditLogger.entries[0]?.action).toBe("DELETE");
  });

  it("does not write audit when create fails validation", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, warehouseCode: "" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("Warehouse application transaction behavior", () => {
  it("commits successful writes", async () => {
    const repository = new InMemoryWarehouseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rolls back data and audit when write fails", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateWarehouseService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("rolls back delete when audit logging fails", async () => {
    const repository = new InMemoryWarehouseRepository();
    repository.seed([buildWarehouseEntity()]);
    const auditLogger = new MockAuditLogger();
    auditLogger.log = vi.fn(async () => {
      throw new Error("audit failed");
    });
    const service = new DeleteWarehouseService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: WAREHOUSE_ID })).rejects.toThrow(
      "audit failed",
    );

    expect(repository.count()).toBe(1);
  });
});
