import { describe, expect, it, vi } from "vitest";

import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
} from "@/modules/rental-order/application/services/rental-order-service.constants";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  type ExternalRentalAgreementStatus,
} from "@/modules/external-rental/domain";
import { buildExternalRentalAgreementEntity } from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import { AGREEMENT_ID } from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  RENTAL_ORDER_ID,
  buildRentalOrderEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  externalRentalRepository: InMemoryExternalRentalRepository,
  options: {
    inventoryRepository?: InMemoryInventoryRepository;
    stockMovementRepository?: InMemoryStockMovementRepository;
    auditLogger?: MockAuditLogger;
    userId?: string;
  } = {},
) {
  return createPassThroughTransactionRunner({
    rentalOrderRepository,
    inventoryRepository:
      options.inventoryRepository ?? new InMemoryInventoryRepository(),
    stockMovementRepository:
      options.stockMovementRepository ?? new InMemoryStockMovementRepository(),
    dispatchRepository: new InMemoryDispatchRepository(),
    externalRentalRepository,
    auditLogger: options.auditLogger ?? new MockAuditLogger(),
    ...mockNotificationWriteScopeDeps,
    userId: options.userId ?? USER_ID,
  });
}

function seedLinkedAgreement(
  status: ExternalRentalAgreementStatus,
  overrides: Parameters<typeof buildExternalRentalAgreementEntity>[0] = {},
) {
  return buildExternalRentalAgreementEntity({
    rentalOrderId: RENTAL_ORDER_ID,
    status,
    ...overrides,
  });
}

describe("CancelRentalOrderService BD-C9 ERA cascade (Phase 25.12)", () => {
  it("A: cancels DRAFT ERA with the rental order and audits both CANCELs", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([seedLinkedAgreement("DRAFT")]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const result = await new CancelRentalOrderService(
      createWriteScope(rentalOrderRepository, externalRentalRepository, {
        stockMovementRepository,
        auditLogger,
      }),
    ).execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(
      (await externalRentalRepository.findById(AGREEMENT_ID))?.status,
    ).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(0);

    const cancelAudits = auditLogger.entries.filter(
      (entry) => entry.action === "CANCEL",
    );
    expect(cancelAudits).toHaveLength(2);
    expect(cancelAudits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: RENTAL_ORDER_MODULE,
          entityName: RENTAL_ORDER_ENTITY_NAME,
          recordId: RENTAL_ORDER_ID,
        }),
        expect.objectContaining({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: AGREEMENT_ID,
        }),
      ]),
    );
  });

  it("B: cancels CONFIRMED ERA and respects BD-C5 amountDue zeroing", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity({ status: "CONFIRMED" })]);
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([
      seedLinkedAgreement("CONFIRMED", { amountDue: 5000, totalHireInCost: 0 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const result = await new CancelRentalOrderService(
      createWriteScope(rentalOrderRepository, externalRentalRepository, {
        stockMovementRepository,
        auditLogger,
      }),
    ).execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    const cancelled = await externalRentalRepository.findById(AGREEMENT_ID);
    expect(cancelled?.status).toBe("CANCELLED");
    expect(cancelled?.amountDue).toBe(0);
    expect(cancelled?.totalHireInCost).toBe(0);
    expect(stockMovementRepository.count()).toBe(0);
    expect(
      auditLogger.entries.filter(
        (entry) =>
          entry.action === "CANCEL" &&
          entry.module === EXTERNAL_RENTAL_MODULE,
      ),
    ).toHaveLength(1);
  });

  it.each([
    ["C", "PARTIALLY_RECEIVED"],
    ["D", "RECEIVED"],
    ["E", "ALLOCATED"],
    ["F", "IN_USE"],
    ["F", "RETURN_PENDING"],
    ["F", "RETURNED"],
  ] as const)(
    "%s: does not cascade post-receive ERA status %s",
    async (_caseId, eraStatus) => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildRentalOrderEntity()]);
      const externalRentalRepository = new InMemoryExternalRentalRepository();
      externalRentalRepository.seed([seedLinkedAgreement(eraStatus)]);
      const auditLogger = new MockAuditLogger();

      const result = await new CancelRentalOrderService(
        createWriteScope(rentalOrderRepository, externalRentalRepository, {
          auditLogger,
        }),
      ).execute({ id: RENTAL_ORDER_ID });

      expect(result.status).toBe("CANCELLED");
      expect(
        (await externalRentalRepository.findById(AGREEMENT_ID))?.status,
      ).toBe(eraStatus);
      expect(
        auditLogger.entries.filter(
          (entry) =>
            entry.action === "CANCEL" &&
            entry.module === EXTERNAL_RENTAL_MODULE,
        ),
      ).toHaveLength(0);
    },
  );

  it("G: already CANCELLED ERA is a no-op and does not fail RO cancel", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([seedLinkedAgreement("CANCELLED")]);
    const auditLogger = new MockAuditLogger();

    const result = await new CancelRentalOrderService(
      createWriteScope(rentalOrderRepository, externalRentalRepository, {
        auditLogger,
      }),
    ).execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(
      (await externalRentalRepository.findById(AGREEMENT_ID))?.status,
    ).toBe("CANCELLED");
    expect(
      auditLogger.entries.filter((entry) => entry.action === "CANCEL"),
    ).toHaveLength(1);
    expect(auditLogger.entries[0]?.module).toBe(RENTAL_ORDER_MODULE);
  });

  it("H: no ERA leaves existing RO cancellation unchanged", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const result = await new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryExternalRentalRepository(),
        { stockMovementRepository, auditLogger },
      ),
    ).execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(0);
    expect(
      auditLogger.entries.filter((entry) => entry.action === "CANCEL"),
    ).toHaveLength(1);
  });

  it("owned F-01 RELEASE still runs; ERA cascade adds no stock movement", async () => {
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
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([seedLinkedAgreement("DRAFT")]);

    const result = await new CancelRentalOrderService(
      createWriteScope(rentalOrderRepository, externalRentalRepository, {
        inventoryRepository,
        stockMovementRepository,
      }),
    ).execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
    expect(result.items[0]?.reservedQuantity).toBe(0);
    expect(
      (await externalRentalRepository.findById(AGREEMENT_ID))?.status,
    ).toBe("CANCELLED");

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(100);
    expect(inventory?.reservedQuantity).toBe(0);
    expect(stockMovementRepository.count()).toBe(1);
    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("RELEASE");
  });

  it("ERA cascade does not inflate F-02 owned availability", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([seedLinkedAgreement("DRAFT")]);

    await new CancelRentalOrderService(
      createWriteScope(rentalOrderRepository, externalRentalRepository),
    ).execute({ id: RENTAL_ORDER_ID });

    const snapshot = calculateDateAwareAvailabilitySnapshot({
      quantityOnHand: 300,
      reservedQuantity: 0,
      requestedPeriod: {
        startDate: new Date("2026-08-10T00:00:00.000Z"),
        endDate: new Date("2026-08-12T00:00:00.000Z"),
      },
      lines: [],
    });

    expect(snapshot.baseCapacity).toBe(300);
    expect(snapshot.dateAwareAvailableQuantity).toBe(300);
  });

  it("rolls back RO cancel when ERA persistence fails", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([seedLinkedAgreement("DRAFT")]);
    const auditLogger = new MockAuditLogger();

    vi.spyOn(externalRentalRepository, "updateWorkflow").mockRejectedValue(
      new Error("ERA persist failed"),
    );

    await expect(
      new CancelRentalOrderService(
        createRollbackTransactionRunner(
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          USER_ID,
          new InMemoryDispatchRepository(),
          externalRentalRepository,
        ),
      ).execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toThrow("ERA persist failed");

    expect(
      (await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status,
    ).toBe("DRAFT");
    expect(
      (await externalRentalRepository.findById(AGREEMENT_ID))?.status,
    ).toBe("DRAFT");
    expect(
      auditLogger.entries.some((entry) => entry.action === "CANCEL"),
    ).toBe(false);
  });
});
