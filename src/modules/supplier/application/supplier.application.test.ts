import { describe, expect, it, vi } from "vitest";

import { CreateSupplierService } from "@/modules/supplier/application/services/create-supplier.service";
import { DeleteSupplierService } from "@/modules/supplier/application/services/delete-supplier.service";
import { GetSupplierByIdService } from "@/modules/supplier/application/services/get-supplier-by-id.service";
import { ListSuppliersService } from "@/modules/supplier/application/services/list-suppliers.service";
import { UpdateSupplierService } from "@/modules/supplier/application/services/update-supplier.service";
import {
  SUPPLIER_ENTITY_NAME,
  SUPPLIER_MODULE,
} from "@/modules/supplier/application/services/supplier-service.constants";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";
import { ValidationError } from "@/shared/infrastructure/errors";

import {
  SUPPLIER_ID,
  OTHER_SUPPLIER_ID,
  VALID_CREATE_INPUT,
  buildSupplierEntity,
} from "../tests/helpers/supplier.fixtures";
import { createPhoneNumber, createSupplierCode } from "@/modules/supplier/domain";
import { InMemorySupplierRepository } from "../tests/helpers/in-memory-supplier.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

describe("CreateSupplierService", () => {
  it("creates a supplier and returns a DTO", async () => {
    const repository = new InMemorySupplierRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.supplierCode).toBe("SUPP-001");
    expect(repository.count()).toBe(1);
  });

  it("rejects duplicate supplier code", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects duplicate phone number", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, supplierCode: "SUPP-002" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const repository = new InMemorySupplierRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, phone: "bad" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("UpdateSupplierService", () => {
  it("updates an existing supplier", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: SUPPLIER_ID },
      { name: "Updated Name" },
    );

    expect(result.name).toBe("Updated Name");
  });

  it("throws when supplier does not exist", async () => {
    const repository = new InMemorySupplierRepository();
    const auditLogger = new MockAuditLogger();
    const service = new UpdateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: SUPPLIER_ID }, { name: "Updated Name" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects duplicate phone on update", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([
      buildSupplierEntity(),
      buildSupplierEntity({
        id: OTHER_SUPPLIER_ID,
        supplierCode: createSupplierCode("SUPP-002"),
        phone: createPhoneNumber("+923009999999"),
      }),
    ]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: SUPPLIER_ID }, { phone: "+923009999999" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("DeleteSupplierService", () => {
  it("deletes an existing supplier", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: SUPPLIER_ID });

    expect(repository.count()).toBe(0);
  });

  it("throws when supplier does not exist", async () => {
    const repository = new InMemorySupplierRepository();
    const auditLogger = new MockAuditLogger();
    const service = new DeleteSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute({ id: SUPPLIER_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetSupplierByIdService", () => {
  it("returns supplier DTO", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const service = new GetSupplierByIdService(repository);

    const result = await service.execute({ id: SUPPLIER_ID });

    expect(result.id).toBe(SUPPLIER_ID);
  });

  it("throws NotFoundError for missing supplier", async () => {
    const service = new GetSupplierByIdService(new InMemorySupplierRepository());

    await expect(service.execute({ id: SUPPLIER_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListSuppliersService", () => {
  it("returns paginated DTOs", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([
      buildSupplierEntity(),
      buildSupplierEntity({
        id: OTHER_SUPPLIER_ID,
        supplierCode: createSupplierCode("SUPP-002"),
        phone: createPhoneNumber("+923009999999"),
        name: "Second Supplier",
      }),
    ]);
    const service = new ListSuppliersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 1,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(2);
  });
});

describe("Supplier application audit behavior", () => {
  it("writes CREATE audit on success", async () => {
    const repository = new InMemorySupplierRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
    expect(auditLogger.entries[0]?.module).toBe(SUPPLIER_MODULE);
    expect(auditLogger.entries[0]?.entityName).toBe(SUPPLIER_ENTITY_NAME);
  });

  it("writes UPDATE audit with old and new values", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: SUPPLIER_ID }, { name: "Updated Name" });

    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.oldValues).toMatchObject({
      name: "Fabric Wholesale Co",
    });
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      name: "Updated Name",
    });
  });

  it("writes DELETE audit on success", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: SUPPLIER_ID });

    expect(auditLogger.entries[0]?.action).toBe("DELETE");
  });

  it("does not write audit when create fails validation", async () => {
    const repository = new InMemorySupplierRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, supplierCode: "" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("Supplier application transaction behavior", () => {
  it("commits successful writes", async () => {
    const repository = new InMemorySupplierRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rolls back data and audit when write fails", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateSupplierService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("rolls back delete when audit logging fails", async () => {
    const repository = new InMemorySupplierRepository();
    repository.seed([buildSupplierEntity()]);
    const auditLogger = new MockAuditLogger();
    auditLogger.log = vi.fn(async () => {
      throw new Error("audit failed");
    });
    const service = new DeleteSupplierService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: SUPPLIER_ID })).rejects.toThrow(
      "audit failed",
    );

    expect(repository.count()).toBe(1);
  });
});
