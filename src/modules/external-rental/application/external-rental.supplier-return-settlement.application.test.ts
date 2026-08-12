import { describe, expect, it } from "vitest";

import { AllocateExternalRentalService } from "@/modules/external-rental/application/services/allocate-external-rental.service";
import { ConfirmExternalRentalService } from "@/modules/external-rental/application/services/confirm-external-rental.service";
import { ReceiveExternalRentalService } from "@/modules/external-rental/application/services/receive-external-rental.service";
import { SettleExternalRentalService } from "@/modules/external-rental/application/services/settle-external-rental.service";
import { SupplierReturnExternalRentalService } from "@/modules/external-rental/application/services/supplier-return-external-rental.service";
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
import { createPassThroughExternalRentalTransactionRunner } from "../tests/helpers/transaction-test-runner";

function createServices(
  agreement: ExternalRentalAgreement = buildExternalRentalAgreementEntity(),
) {
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
    confirm: new ConfirmExternalRentalService(runner),
    receive: new ReceiveExternalRentalService(runner),
    allocate: new AllocateExternalRentalService(runner),
    supplierReturn: new SupplierReturnExternalRentalService(runner),
    settle: new SettleExternalRentalService(runner),
  };
}

function buildReadyForSupplierReturn(qty = 100) {
  return buildExternalRentalAgreementEntity({
    status: "ALLOCATED",
    totalHireInCost: qty * 25,
    amountDue: qty * 25,
    amountPaid: 0,
    settlementStatus: "UNSETTLED",
    items: [
      {
        id: AGREEMENT_ITEM_ID,
        productId: PRODUCT_ID,
        rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
        quantityRequested: qty,
        quantityConfirmed: qty,
        quantityReceived: qty,
        quantityAllocated: qty,
        quantityDispatched: 0,
        quantityReturnedFromCustomer: 0,
        quantityReturnedToSupplier: 0,
        quantityWrittenOff: 0,
        unitCost: 25,
        lineHireInCost: qty * 25,
        notes: null,
      },
    ],
  });
}

describe("Phase 25.5.5 supplier return + settlement", () => {
  describe("supplier return", () => {
    it("returns full external custody to supplier → RETURNED", async () => {
      const { supplierReturn, auditLogger } = createServices(
        buildReadyForSupplierReturn(100),
      );

      const result = await supplierReturn.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 }],
        },
      );

      expect(result.status).toBe("RETURNED");
      expect(result.items[0].quantityReturnedToSupplier).toBe(100);
      expect(auditLogger.entries).toHaveLength(1);
    });

    it("supports partial supplier return", async () => {
      const services = createServices(buildReadyForSupplierReturn(100));

      const first = await services.supplierReturn.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 60 }],
        },
      );
      expect(first.status).toBe("RETURN_PENDING");
      expect(first.items[0].quantityReturnedToSupplier).toBe(60);

      const second = await services.supplierReturn.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 }],
        },
      );
      expect(second.status).toBe("RETURNED");
      expect(second.items[0].quantityReturnedToSupplier).toBe(100);
    });

    it("rejects return while qty is still with customer", async () => {
      const inUse = buildReadyForSupplierReturn(100)
        .withDispatched([
          { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 },
        ]);
      const { supplierReturn } = createServices(inUse);

      await expect(
        supplierReturn.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects return greater than received / custody", async () => {
      const { supplierReturn } = createServices(buildReadyForSupplierReturn(50));

      await expect(
        supplierReturn.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 51 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects supplier return on cancelled agreement", async () => {
      const { supplierReturn } = createServices(
        buildExternalRentalAgreementEntity({ status: "CANCELLED" }),
      );

      await expect(
        supplierReturn.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("does not imply Inventory / reservedQuantity mutation", async () => {
      const { supplierReturn } = createServices(buildReadyForSupplierReturn(40));
      const result = await supplierReturn.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 }],
        },
      );

      expect(result).not.toHaveProperty("quantityOnHand");
      expect(
        Object.keys(result).some((key) =>
          key.toLowerCase().includes("inventory"),
        ),
      ).toBe(false);
      expect(result.items[0].quantityReturnedToSupplier).toBe(40);
    });
  });

  describe("settlement", () => {
    it("records partial then full payment without changing operational status", async () => {
      const returned = buildReadyForSupplierReturn(100).withSupplierReturned([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 },
      ]);
      const { settle } = createServices(returned);

      const partial = await settle.execute(
        { id: AGREEMENT_ID },
        { paymentAmount: 1000 },
      );
      expect(partial.status).toBe("RETURNED");
      expect(partial.settlementStatus).toBe("PARTIALLY_SETTLED");
      expect(partial.amountPaid).toBe(1000);
      expect(partial.outstandingBalance).toBe(1500);

      const full = await settle.execute(
        { id: AGREEMENT_ID },
        { paymentAmount: 1500 },
      );
      expect(full.status).toBe("RETURNED");
      expect(full.settlementStatus).toBe("SETTLED");
      expect(full.amountPaid).toBe(2500);
      expect(full.outstandingBalance).toBe(0);
    });

    it("allows settlement while still operationally open", async () => {
      const { settle } = createServices(buildReadyForSupplierReturn(100));

      const result = await settle.execute(
        { id: AGREEMENT_ID },
        { paymentAmount: 2500 },
      );

      expect(result.status).toBe("ALLOCATED");
      expect(result.settlementStatus).toBe("SETTLED");
    });

    it("rejects payment greater than amountDue", async () => {
      const { settle } = createServices(buildReadyForSupplierReturn(100));

      await expect(
        settle.execute({ id: AGREEMENT_ID }, { paymentAmount: 2501 }),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects payment on cancelled agreement", async () => {
      const { settle } = createServices(
        buildExternalRentalAgreementEntity({
          status: "CANCELLED",
          amountDue: 100,
        }),
      );

      await expect(
        settle.execute({ id: AGREEMENT_ID }, { paymentAmount: 10 }),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("does not mutate PurchaseOrder / inventory valuation fields", async () => {
      const { settle } = createServices(buildReadyForSupplierReturn(100));
      const result = await settle.execute(
        { id: AGREEMENT_ID },
        { paymentAmount: 500 },
      );

      expect(result).not.toHaveProperty("purchaseOrderId");
      expect(result).not.toHaveProperty("purchaseCost");
      expect(result).not.toHaveProperty("quantityOnHand");
      expect(result.totalHireInCost).toBe(2500);
      expect(result.amountDue).toBe(2500);
    });
  });
});
