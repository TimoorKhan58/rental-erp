import { describe, expect, it, vi } from "vitest";

import { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import { GetExternalRentalByIdService } from "@/modules/external-rental/application/services/get-external-rental-by-id.service";
import { ListExternalRentalsService } from "@/modules/external-rental/application/services/list-external-rentals.service";
import type { CreateExternalRentalInput } from "@/modules/external-rental/application/schemas/external-rental.schemas";
import { ConflictError, UnprocessableError } from "@/shared/infrastructure/errors";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";

import {
  AGREEMENT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildCreateExternalRentalAgreementData,
  buildExternalRentalAgreementEntity,
} from "../tests/helpers/external-rental.fixtures";
import { createSeededExternalRentalRepository } from "../tests/helpers/in-memory-external-rental.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughExternalRentalTransactionRunner } from "../tests/helpers/transaction-test-runner";

function toCreateInput(
  overrides: Record<string, unknown> = {},
): CreateExternalRentalInput {
  return {
    ...VALID_CREATE_INPUT,
    hireStartDate: new Date(VALID_CREATE_INPUT.hireStartDate),
    hireEndDate: new Date(VALID_CREATE_INPUT.hireEndDate),
    expectedReturnToSupplierDate: new Date(
      VALID_CREATE_INPUT.expectedReturnToSupplierDate,
    ),
    ...overrides,
  } as CreateExternalRentalInput;
}

function createNumberSequences(
  overrides: Partial<INumberSequenceRepository> = {},
): INumberSequenceRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByDocumentType: vi.fn(),
    update: vi.fn(),
    generateNextNumber: vi.fn().mockResolvedValue({
      formattedNumber: "ERA-2026-AUTO",
    }),
    ...overrides,
  } as unknown as INumberSequenceRepository;
}

describe("CreateExternalRentalService", () => {
  it("creates agreement via repository only (no inventory side effects)", async () => {
    const repository = createSeededExternalRentalRepository([]);
    const auditLogger = new MockAuditLogger();
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger,
      userId: USER_ID,
    });
    const createSpy = vi.spyOn(repository, "create");
    const service = new CreateExternalRentalService(
      runner,
      createNumberSequences(),
      USER_ID,
    );

    const result = await service.execute(
      toCreateInput({
        agreementNumber: undefined,
        rentalOrderId: "bb0e8400-e29b-41d4-a716-446655440099",
      }),
    );

    expect(result.agreementNumber).toBe("ERA-2026-AUTO");
    expect(result.status).toBe("DRAFT");
    expect(result.items[0]?.qtyInCompanyCustody).toBe(0);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
  });

  it("requires userId", async () => {
    const repository = createSeededExternalRentalRepository([]);
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger: new MockAuditLogger(),
      userId: USER_ID,
    });
    const service = new CreateExternalRentalService(
      runner,
      createNumberSequences(),
      undefined,
    );

    await expect(service.execute(toCreateInput())).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("conflicts when rental order already has an active agreement", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity(),
    ]);
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger: new MockAuditLogger(),
      userId: USER_ID,
    });
    const service = new CreateExternalRentalService(
      runner,
      createNumberSequences(),
      USER_ID,
    );

    await expect(
      service.execute(
        toCreateInput({
          agreementNumber: "ERA-2026-002",
          rentalOrderId: RENTAL_ORDER_ID,
        }),
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof ConflictError &&
        /Active external rental agreement/i.test(error.message),
    );
  });
});

describe("GetExternalRentalByIdService", () => {
  it("returns dto with custody balances", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity(),
    ]);
    const service = new GetExternalRentalByIdService(repository);
    const result = await service.execute({ id: AGREEMENT_ID });

    expect(result.id).toBe(AGREEMENT_ID);
    expect(result.items[0]).toMatchObject({
      qtyWithCustomer: 0,
      qtyInCompanyCustody: 0,
      qtyOwedToSupplier: 0,
    });
  });
});

describe("ListExternalRentalsService", () => {
  it("filters by status and paginates", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity(),
      buildExternalRentalAgreementEntity({
        id: "cc0e8400-e29b-41d4-a716-446655440020" as never,
        agreementNumber: "ERA-2026-002",
        status: "CONFIRMED",
        rentalOrderId: "dd0e8400-e29b-41d4-a716-446655440021" as never,
      }),
    ]);
    const service = new ListExternalRentalsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "DRAFT",
    });

    expect(result.meta.total).toBe(1);
    expect(result.items[0]?.status).toBe("DRAFT");
  });

  it("creates from empty store for list coverage", async () => {
    const repository = createSeededExternalRentalRepository([]);
    await repository.create(buildCreateExternalRentalAgreementData());
    const service = new ListExternalRentalsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
    });
    expect(result.meta.total).toBe(1);
  });
});
