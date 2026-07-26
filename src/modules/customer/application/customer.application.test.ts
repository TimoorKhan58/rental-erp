import { describe, expect, it, vi } from "vitest";

import { CreateCustomerService } from "@/modules/customer/application/services/create-customer.service";
import { DeleteCustomerService } from "@/modules/customer/application/services/delete-customer.service";
import { GetCustomerByIdService } from "@/modules/customer/application/services/get-customer-by-id.service";
import { ListCustomersService } from "@/modules/customer/application/services/list-customers.service";
import { UpdateCustomerService } from "@/modules/customer/application/services/update-customer.service";
import {
  CUSTOMER_ENTITY_NAME,
  CUSTOMER_MODULE,
} from "@/modules/customer/application/services/customer-service.constants";
import { NumberSequence } from "@/modules/settings/domain/number-sequence.entity";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import type { GeneratedNumberResult } from "@/modules/settings/domain/number-sequence.types";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";
import { ValidationError } from "@/shared/infrastructure/errors";
import type { CompanySettingId, DocumentSequenceId } from "@/shared/domain/ids";

import {
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
  VALID_CREATE_INPUT,
  buildCustomerEntity,
} from "../tests/helpers/customer.fixtures";
import { createCustomerCode, createPhoneNumber } from "@/modules/customer/domain";
import { InMemoryCustomerRepository } from "../tests/helpers/in-memory-customer.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const stubCustomerSequence = NumberSequence.reconstitute({
  id: "ds000001-0000-4000-8000-000000000001" as DocumentSequenceId,
  companySettingId: "cs000001-0000-4000-8000-000000000001" as CompanySettingId,
  documentType: "CUSTOMER",
  prefix: "CUS-",
  suffix: null,
  startingNumber: 1,
  currentNumber: 2,
  paddingLength: 5,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const stubGenerateNextNumberResult: GeneratedNumberResult = {
  formattedNumber: "CUS-00001",
  number: 1,
  sequence: stubCustomerSequence,
};

const stubNumberSequences: INumberSequenceRepository = {
  findById: vi.fn().mockResolvedValue(null),
  findAll: vi.fn().mockResolvedValue([]),
  findByDocumentType: vi.fn().mockResolvedValue(null),
  update: vi.fn().mockResolvedValue(stubCustomerSequence),
  generateNextNumber: vi.fn().mockResolvedValue(stubGenerateNextNumberResult),
};

describe("CreateCustomerService", () => {
  it("creates a customer and returns a DTO", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
      stubNumberSequences,
    );

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.customerCode).toBe("CUST-001");
    expect(repository.count()).toBe(1);
  });

  it("rejects duplicate customer code", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
      stubNumberSequences,
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects duplicate phone number", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
      stubNumberSequences,
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, customerCode: "CUST-002" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
      stubNumberSequences,
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, phone: "bad" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("UpdateCustomerService", () => {
  it("updates an existing customer", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: CUSTOMER_ID },
      { name: "Updated Name" },
    );

    expect(result.name).toBe("Updated Name");
  });

  it("throws when customer does not exist", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new UpdateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: CUSTOMER_ID }, { name: "Updated Name" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects duplicate phone on update", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([
      buildCustomerEntity(),
      buildCustomerEntity({
        id: OTHER_CUSTOMER_ID,
        customerCode: createCustomerCode("CUST-002"),
        phone: createPhoneNumber("+923009999999"),
      }),
    ]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: CUSTOMER_ID }, { phone: "+923009999999" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("DeleteCustomerService", () => {
  it("deletes an existing customer", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: CUSTOMER_ID });

    expect(repository.count()).toBe(0);
  });

  it("throws when customer does not exist", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new DeleteCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute({ id: CUSTOMER_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetCustomerByIdService", () => {
  it("returns customer DTO", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const service = new GetCustomerByIdService(repository);

    const result = await service.execute({ id: CUSTOMER_ID });

    expect(result.id).toBe(CUSTOMER_ID);
  });

  it("throws NotFoundError for missing customer", async () => {
    const service = new GetCustomerByIdService(new InMemoryCustomerRepository());

    await expect(service.execute({ id: CUSTOMER_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListCustomersService", () => {
  it("returns paginated DTOs", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([
      buildCustomerEntity(),
      buildCustomerEntity({
        id: OTHER_CUSTOMER_ID,
        customerCode: createCustomerCode("CUST-002"),
        phone: createPhoneNumber("+923009999999"),
        name: "Second Customer",
      }),
    ]);
    const service = new ListCustomersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 1,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(2);
  });
});

describe("Customer application audit behavior", () => {
  it("writes CREATE audit on success", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
      stubNumberSequences,
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
    expect(auditLogger.entries[0]?.module).toBe(CUSTOMER_MODULE);
    expect(auditLogger.entries[0]?.entityName).toBe(CUSTOMER_ENTITY_NAME);
  });

  it("writes UPDATE audit with old and new values", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: CUSTOMER_ID }, { name: "Updated Name" });

    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.oldValues).toMatchObject({
      name: "Manyar Tent Service",
    });
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      name: "Updated Name",
    });
  });

  it("writes DELETE audit on success", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: CUSTOMER_ID });

    expect(auditLogger.entries[0]?.action).toBe("DELETE");
  });

  it("does not write audit when create fails validation", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
      stubNumberSequences,
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, phone: "abc" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(auditLogger.entries).toHaveLength(0);
  });

  it("auto-generates customer code when omitted", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
      stubNumberSequences,
    );

    const { customerCode: _ignored, ...withoutCode } = VALID_CREATE_INPUT;
    const result = await service.execute(withoutCode);

    expect(result.customerCode).toBe("CUS-00001");
    expect(stubNumberSequences.generateNextNumber).toHaveBeenCalledWith("CUSTOMER");
  });
});

describe("Customer application transaction behavior", () => {
  it("commits successful writes", async () => {
    const repository = new InMemoryCustomerRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createRollbackTransactionRunner(repository, auditLogger),
      stubNumberSequences,
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rolls back data and audit when write fails", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateCustomerService(
      createRollbackTransactionRunner(repository, auditLogger),
      stubNumberSequences,
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("rolls back delete when audit logging fails", async () => {
    const repository = new InMemoryCustomerRepository();
    repository.seed([buildCustomerEntity()]);
    const auditLogger = new MockAuditLogger();
    auditLogger.log = vi.fn(async () => {
      throw new Error("audit failed");
    });
    const service = new DeleteCustomerService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: CUSTOMER_ID })).rejects.toThrow(
      "audit failed",
    );

    expect(repository.count()).toBe(1);
  });
});
