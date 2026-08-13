import { describe, expect, it, vi } from "vitest";

import { WriteOffExternalRentalService } from "@/modules/external-rental/application/services/write-off-external-rental.service";
import { ExternalRentalAgreement } from "@/modules/external-rental/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import {
  AGREEMENT_ID,
  AGREEMENT_ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ITEM_ID,
  buildExternalRentalAgreementEntity,
} from "../tests/helpers/external-rental.fixtures";
import { createSeededExternalRentalRepository } from "../tests/helpers/in-memory-external-rental.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughExternalRentalTransactionRunner,
  createRollbackExternalRentalTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function buildReceivedAgreement(overrides?: {
  status?: ExternalRentalAgreement["status"];
  quantityReceived?: number;
  quantityDispatched?: number;
  quantityReturnedFromCustomer?: number;
  quantityReturnedToSupplier?: number;
  quantityWrittenOff?: number;
  amountDue?: number;
  amountPaid?: number;
}) {
  const received = overrides?.quantityReceived ?? 100;
  const dispatched = overrides?.quantityDispatched ?? 0;
  const customerReturned = overrides?.quantityReturnedFromCustomer ?? 0;
  const supplierReturned = overrides?.quantityReturnedToSupplier ?? 0;
  const writtenOff = overrides?.quantityWrittenOff ?? 0;

  return buildExternalRentalAgreementEntity({
    status: overrides?.status ?? "ALLOCATED",
    totalHireInCost: received * 25,
    amountDue: overrides?.amountDue ?? received * 25,
    amountPaid: overrides?.amountPaid ?? 0,
    settlementStatus: "UNSETTLED",
    items: [
      {
        id: AGREEMENT_ITEM_ID,
        productId: PRODUCT_ID,
        rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
        quantityRequested: 100,
        quantityConfirmed: 100,
        quantityReceived: received,
        quantityAllocated: received,
        quantityDispatched: dispatched,
        quantityReturnedFromCustomer: customerReturned,
        quantityReturnedToSupplier: supplierReturned,
        quantityWrittenOff: writtenOff,
        unitCost: 25,
        lineHireInCost: received * 25,
        notes: null,
      },
    ],
  });
}

function createService(agreement: ExternalRentalAgreement) {
  const repository = createSeededExternalRentalRepository([agreement]);
  const auditLogger = new MockAuditLogger();
  const runner = createPassThroughExternalRentalTransactionRunner({
    externalRentalRepository: repository,
    auditLogger,
    userId: "user-1",
  });

  return {
    repository,
    auditLogger,
    service: new WriteOffExternalRentalService(runner),
  };
}

describe("Phase 27 WriteOffExternalRentalService", () => {
  it("1: write-off after receive succeeds", async () => {
    const { service, auditLogger } = createService(buildReceivedAgreement());

    const result = await service.execute(
      { id: AGREEMENT_ID },
      {
        items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 20 }],
      },
    );

    expect(result.items[0]?.quantityWrittenOff).toBe(20);
    expect(result.items[0]?.qtyInCompanyCustody).toBe(80);
    expect(result.items[0]?.qtyOwedToSupplier).toBe(80);
    expect(result.status).toBe("RETURN_PENDING");
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      writeOff: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 20 }],
    });
  });

  it("2: partial write-off succeeds", async () => {
    const { service } = createService(buildReceivedAgreement());

    const result = await service.execute(
      { id: AGREEMENT_ID },
      {
        items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 }],
      },
    );

    expect(result.items[0]?.quantityWrittenOff).toBe(40);
    expect(result.status).toBe("RETURN_PENDING");
  });

  it("3: full write-off succeeds → RETURNED", async () => {
    const { service } = createService(buildReceivedAgreement());

    const result = await service.execute(
      { id: AGREEMENT_ID },
      {
        items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 }],
      },
    );

    expect(result.items[0]?.quantityWrittenOff).toBe(100);
    expect(result.items[0]?.qtyInCompanyCustody).toBe(0);
    expect(result.items[0]?.qtyOwedToSupplier).toBe(0);
    expect(result.status).toBe("RETURNED");
  });

  it("4: cannot exceed company custody", async () => {
    const { service } = createService(buildReceivedAgreement());

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 101 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /exceeds qtyInCompanyCustody/i.test(error.message),
    );
  });

  it("5: cannot write off customer-held quantity", async () => {
    const { service } = createService(
      buildReceivedAgreement({
        status: "IN_USE",
        quantityDispatched: 100,
      }),
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /No external company custody/i.test(error.message),
    );
  });

  it("6: cannot write off supplier-returned quantity", async () => {
    const { service } = createService(
      buildReceivedAgreement({
        status: "RETURN_PENDING",
        quantityReturnedToSupplier: 100,
      }),
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /No external company custody/i.test(error.message),
    );
  });

  it("7: cannot write off twice beyond remaining custody", async () => {
    const { service } = createService(buildReceivedAgreement());

    await service.execute(
      { id: AGREEMENT_ID },
      {
        items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 80 }],
      },
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 30 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /exceeds qtyInCompanyCustody/i.test(error.message),
    );
  });

  it("8: cannot write off DRAFT", async () => {
    const { service } = createService(
      buildExternalRentalAgreementEntity({ status: "DRAFT" }),
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /Cannot write-off/i.test(error.message),
    );
  });

  it("9: cannot write off CONFIRMED with zero received", async () => {
    const { service } = createService(
      buildExternalRentalAgreementEntity({
        status: "CONFIRMED",
        items: [
          {
            id: AGREEMENT_ITEM_ID,
            productId: PRODUCT_ID,
            rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
            quantityRequested: 100,
            quantityConfirmed: 100,
            quantityReceived: 0,
            quantityAllocated: 0,
            quantityDispatched: 0,
            quantityReturnedFromCustomer: 0,
            quantityReturnedToSupplier: 0,
            quantityWrittenOff: 0,
            unitCost: 25,
            lineHireInCost: 0,
            notes: null,
          },
        ],
      }),
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /Cannot write-off/i.test(error.message),
    );
  });

  it("10: cannot write off CANCELLED", async () => {
    const { service } = createService(
      buildExternalRentalAgreementEntity({ status: "CANCELLED" }),
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /Cannot write-off/i.test(error.message),
    );
  });

  it("11: cannot write off RETURNED", async () => {
    const { service } = createService(
      buildReceivedAgreement({
        status: "RETURNED",
        quantityReturnedToSupplier: 100,
      }),
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /Cannot write-off/i.test(error.message),
    );
  });

  it("12: supplier return + write-off boundary reaches RETURNED", async () => {
    const { service } = createService(
      buildReceivedAgreement({
        status: "RETURN_PENDING",
        quantityReturnedToSupplier: 80,
      }),
    );

    const result = await service.execute(
      { id: AGREEMENT_ID },
      {
        items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 20 }],
      },
    );

    expect(result.items[0]?.quantityReturnedToSupplier).toBe(80);
    expect(result.items[0]?.quantityWrittenOff).toBe(20);
    expect(result.items[0]?.qtyOwedToSupplier).toBe(0);
    expect(result.status).toBe("RETURNED");
  });

  it("13–18: write-off does not mutate inventory, settlement, or F-02 surfaces", async () => {
    const agreement = buildReceivedAgreement({
      amountDue: 2500,
      amountPaid: 500,
    });
    const { service, repository } = createService(agreement);
    const before = await repository.findById(AGREEMENT_ID);
    const beforeAmountDue = before?.amountDue;
    const beforeAmountPaid = before?.amountPaid;
    const beforeSettlement = before?.settlementStatus;

    const result = await service.execute(
      { id: AGREEMENT_ID },
      {
        items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 25 }],
      },
    );

    expect(result.amountDue).toBe(beforeAmountDue);
    expect(result.amountPaid).toBe(beforeAmountPaid);
    expect(result.settlementStatus).toBe(beforeSettlement);
  });

  it("19: audit contains WRITE_OFF identification payload", async () => {
    const { service, auditLogger } = createService(buildReceivedAgreement());

    await service.execute(
      { id: AGREEMENT_ID },
      {
        items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 15 }],
      },
    );

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      action: "UPDATE",
      status: "SUCCESS",
      module: "external-rentals",
      oldValues: expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ quantityWrittenOff: 0 }),
        ]),
      }),
      newValues: expect.objectContaining({
        writeOff: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 15 }],
        items: expect.arrayContaining([
          expect.objectContaining({ quantityWrittenOff: 15 }),
        ]),
      }),
    });
  });

  it("20: transaction rollback restores state when audit fails", async () => {
    const agreement = buildReceivedAgreement();
    const repository = createSeededExternalRentalRepository([agreement]);
    const auditLogger = new MockAuditLogger();
    const runner = createRollbackExternalRentalTransactionRunner(
      repository,
      auditLogger,
      "user-1",
    );
    const service = new WriteOffExternalRentalService(runner);

    vi.spyOn(auditLogger, "log").mockRejectedValueOnce(
      new Error("audit failure"),
    );

    await expect(
      service.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 10 }],
        },
      ),
    ).rejects.toThrow(/audit failure/i);

    const restored = await repository.findById(AGREEMENT_ID);
    expect(restored?.items[0]?.quantityWrittenOff).toBe(0);
    expect(restored?.status).toBe("ALLOCATED");
    expect(auditLogger.entries).toHaveLength(0);
  });
});
