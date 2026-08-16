import { describe, expect, it, vi } from "vitest";

import { CancelExternalRentalService } from "@/modules/external-rental/application/services/cancel-external-rental.service";
import { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import type { CreateExternalRentalInput } from "@/modules/external-rental/application/schemas/external-rental.schemas";
import {
  ConflictError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";

import {
  AGREEMENT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  VALID_CREATE_INPUT,
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
      formattedNumber: "ERA-2026-REPLACEMENT",
    }),
    ...overrides,
  } as unknown as INumberSequenceRepository;
}

describe("CancelExternalRentalService (Phase 25.10 / BD-C4)", () => {
  it("cancels DRAFT, persists CANCELLED, and audits CANCEL", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity(),
    ]);
    const auditLogger = new MockAuditLogger();
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger,
      userId: USER_ID,
    });
    // Phase 29 (F-02): Cancel now uses the atomic claimStatusTransition
    // primitive instead of updateWorkflow.
    const claimSpy = vi.spyOn(repository, "claimStatusTransition");
    const service = new CancelExternalRentalService(runner);

    const result = await service.execute({ id: AGREEMENT_ID });

    expect(result.status).toBe("CANCELLED");
    expect(claimSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CANCEL");
  });

  it("zeros provisional amountDue when cancelling CONFIRMED", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity({
        status: "CONFIRMED",
        amountDue: 5000,
      }),
    ]);
    const auditLogger = new MockAuditLogger();
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger,
      userId: USER_ID,
    });
    const service = new CancelExternalRentalService(runner);

    const result = await service.execute({ id: AGREEMENT_ID });

    expect(result.status).toBe("CANCELLED");
    expect(result.amountDue).toBe(0);
    expect(result.totalHireInCost).toBe(0);
  });

  it("rejects cancel after receive (invalid state)", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity({ status: "RECEIVED" }),
    ]);
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger: new MockAuditLogger(),
      userId: USER_ID,
    });
    const service = new CancelExternalRentalService(runner);

    await expect(service.execute({ id: AGREEMENT_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("does not touch inventory (UoW scope has no inventory port)", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity(),
    ]);
    const auditLogger = new MockAuditLogger();
    const scope = {
      externalRentalRepository: repository,
      auditLogger,
      userId: USER_ID,
    };
    const runner = createPassThroughExternalRentalTransactionRunner(scope);
    const service = new CancelExternalRentalService(runner);

    await service.execute({ id: AGREEMENT_ID });

    expect(Object.keys(scope).sort()).toEqual([
      "auditLogger",
      "externalRentalRepository",
      "userId",
    ]);
    expect("inventoryRepository" in scope).toBe(false);
  });

  it("allows create after cancel for the same rental order (BD-C4)", async () => {
    const cancelled = buildExternalRentalAgreementEntity({
      status: "CANCELLED",
    });
    const repository = createSeededExternalRentalRepository([cancelled]);
    const auditLogger = new MockAuditLogger();
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger,
      userId: USER_ID,
    });
    const createService = new CreateExternalRentalService(
      runner,
      createNumberSequences(),
      USER_ID,
    );

    const created = await createService.execute(
      toCreateInput({
        agreementNumber: undefined,
        rentalOrderId: RENTAL_ORDER_ID,
      }),
    );

    expect(created.status).toBe("DRAFT");
    expect(created.rentalOrderId).toBe(RENTAL_ORDER_ID);
    expect(created.id).not.toBe(AGREEMENT_ID);
  });

  it("conflicts when an active agreement already exists", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity({ status: "CONFIRMED" }),
    ]);
    const runner = createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: repository,
      auditLogger: new MockAuditLogger(),
      userId: USER_ID,
    });
    const createService = new CreateExternalRentalService(
      runner,
      createNumberSequences(),
      USER_ID,
    );

    await expect(
      createService.execute(
        toCreateInput({
          agreementNumber: "ERA-2026-002",
          rentalOrderId: RENTAL_ORDER_ID,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("InMemoryExternalRentalRepository.findActiveByRentalOrderId", () => {
  it("filters out CANCELLED agreements", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity({ status: "CANCELLED" }),
    ]);

    const active = await repository.findActiveByRentalOrderId(RENTAL_ORDER_ID);

    expect(active).toBeNull();
  });

  it("returns active (non-CANCELLED) agreement", async () => {
    const repository = createSeededExternalRentalRepository([
      buildExternalRentalAgreementEntity({ status: "DRAFT" }),
    ]);

    const active = await repository.findActiveByRentalOrderId(RENTAL_ORDER_ID);

    expect(active?.id).toBe(AGREEMENT_ID);
    expect(active?.status).toBe("DRAFT");
  });
});
