import { describe, expect, it } from "vitest";

import { AllocateExternalRentalService } from "@/modules/external-rental/application/services/allocate-external-rental.service";
import { ConfirmExternalRentalService } from "@/modules/external-rental/application/services/confirm-external-rental.service";
import { ReceiveExternalRentalService } from "@/modules/external-rental/application/services/receive-external-rental.service";
import { ExternalRentalAgreement } from "@/modules/external-rental/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import {
  AGREEMENT_ID,
  RENTAL_ORDER_ITEM_ID,
  buildCreateExternalRentalAgreementData,
  buildExternalRentalAgreementEntity,
} from "../tests/helpers/external-rental.fixtures";
import { createSeededExternalRentalRepository } from "../tests/helpers/in-memory-external-rental.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughExternalRentalTransactionRunner } from "../tests/helpers/transaction-test-runner";

function createServices(agreement: ExternalRentalAgreement = buildExternalRentalAgreementEntity()) {
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
  };
}

describe("Phase 25.5.3 external rental confirm/receive/allocate", () => {
  describe("confirm", () => {
    it("confirms a draft agreement and sets provisional amountDue", async () => {
      const { confirm, auditLogger } = createServices();
      const result = await confirm.execute({ id: AGREEMENT_ID });

      expect(result.status).toBe("CONFIRMED");
      expect(result.items[0].quantityConfirmed).toBe(200);
      expect(result.amountDue).toBe(5000);
      expect(result.totalHireInCost).toBe(0);
      expect(auditLogger.entries).toHaveLength(1);
      expect(auditLogger.entries[0]?.action).toBe("APPROVE");
    });

    it("rejects confirmed quantity greater than requested", async () => {
      const { confirm } = createServices();

      await expect(
        confirm.execute(
          { id: AGREEMENT_ID },
          {
            items: [
              {
                rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
                quantityConfirmed: 201,
              },
            ],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects confirmation of already confirmed agreement", async () => {
      const { confirm } = createServices();
      await confirm.execute({ id: AGREEMENT_ID });

      await expect(confirm.execute({ id: AGREEMENT_ID })).rejects.toBeInstanceOf(
        UnprocessableError,
      );
    });

    it("rejects confirmation of cancelled agreement", async () => {
      const cancelled = buildExternalRentalAgreementEntity({
        status: "CANCELLED",
      });
      const { confirm } = createServices(cancelled);

      await expect(confirm.execute({ id: AGREEMENT_ID })).rejects.toBeInstanceOf(
        UnprocessableError,
      );
    });
  });

  describe("receive", () => {
    async function confirmedServices() {
      const services = createServices();
      await services.confirm.execute({ id: AGREEMENT_ID });
      return services;
    }

    it("receives full quantity and recognizes hire-in cost", async () => {
      const { receive } = await confirmedServices();
      const result = await receive.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 200 }],
        },
      );

      expect(result.status).toBe("RECEIVED");
      expect(result.items[0].quantityReceived).toBe(200);
      expect(result.items[0].lineHireInCost).toBe(5000);
      expect(result.totalHireInCost).toBe(5000);
      expect(result.amountDue).toBe(5000);
    });

    it("supports partial receipt", async () => {
      const { receive } = await confirmedServices();
      const result = await receive.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 80 }],
        },
      );

      expect(result.status).toBe("PARTIALLY_RECEIVED");
      expect(result.items[0].quantityReceived).toBe(80);
      expect(result.totalHireInCost).toBe(2000);
      expect(result.amountDue).toBe(2000);
    });

    it("rejects received greater than confirmed", async () => {
      const { receive } = await confirmedServices();

      await expect(
        receive.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 201 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects receive before confirmation", async () => {
      const { receive } = createServices();

      await expect(
        receive.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 10 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects receive on cancelled agreement", async () => {
      const cancelled = buildExternalRentalAgreementEntity({
        status: "CANCELLED",
      });
      const { receive } = createServices(cancelled);

      await expect(
        receive.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 10 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });
  });

  describe("allocate", () => {
    async function receivedServices(qty = 200) {
      const services = createServices();
      await services.confirm.execute({ id: AGREEMENT_ID });
      await services.receive.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: qty }],
        },
      );
      return services;
    }

    it("allocates received quantity to the rental-order item", async () => {
      const { allocate } = await receivedServices();
      const result = await allocate.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 200 }],
        },
      );

      expect(result.status).toBe("ALLOCATED");
      expect(result.items[0].quantityAllocated).toBe(200);
      expect(result.items[0].rentalOrderItemId).toBe(RENTAL_ORDER_ITEM_ID);
    });

    it("supports partial allocation", async () => {
      const { allocate } = await receivedServices();
      const result = await allocate.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 50 }],
        },
      );

      expect(result.status).toBe("RECEIVED");
      expect(result.items[0].quantityAllocated).toBe(50);
    });

    it("rejects allocated greater than received", async () => {
      const { allocate } = await receivedServices(100);

      await expect(
        allocate.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 101 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects allocation before receipt", async () => {
      const services = createServices();
      await services.confirm.execute({ id: AGREEMENT_ID });

      await expect(
        services.allocate.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 10 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("rejects allocation on cancelled agreement", async () => {
      const cancelled = buildExternalRentalAgreementEntity({
        status: "CANCELLED",
      });
      const { allocate } = createServices(cancelled);

      await expect(
        allocate.execute(
          { id: AGREEMENT_ID },
          {
            items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 10 }],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });
  });

  describe("ownership and financial isolation", () => {
    it("external receive does not imply Inventory.quantityOnHand mutation", async () => {
      const services = createServices();
      await services.confirm.execute({ id: AGREEMENT_ID });
      const result = await services.receive.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 200 }],
        },
      );

      // Receive path only updates ERA counters/money — no inventory fields on DTO.
      expect(result).not.toHaveProperty("quantityOnHand");
      expect(result.items[0].quantityReceived).toBe(200);
      expect(
        Object.keys(result).some((key) =>
          key.toLowerCase().includes("inventory"),
        ),
      ).toBe(false);
    });

    it("external allocation does not mutate owned reservedQuantity semantics", async () => {
      const services = createServices();
      await services.confirm.execute({ id: AGREEMENT_ID });
      await services.receive.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 200 }],
        },
      );
      const result = await services.allocate.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 200 }],
        },
      );

      expect(result.items[0].quantityAllocated).toBe(200);
      expect(result.items[0]).not.toHaveProperty("reservedQuantity");
    });

    it("hire-in cost stays on the agreement and does not reference PurchaseOrder", async () => {
      const services = createServices();
      await services.confirm.execute({ id: AGREEMENT_ID });
      const result = await services.receive.execute(
        { id: AGREEMENT_ID },
        {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 200 }],
        },
      );

      expect(result.totalHireInCost).toBe(5000);
      expect(result.amountDue).toBe(5000);
      expect(result).not.toHaveProperty("purchaseOrderId");
      expect(result).not.toHaveProperty("purchaseCost");
    });

    it("domain create still produces zero owned-stock counters", () => {
      const created = ExternalRentalAgreement.create(
        buildCreateExternalRentalAgreementData(),
      );
      expect(created.items[0].quantityReceived).toBe(0);
      expect(created.totalHireInCost).toBe(0);
    });
  });
});
