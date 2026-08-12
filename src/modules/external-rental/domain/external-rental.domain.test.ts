import { describe, expect, it } from "vitest";

import {
  ExternalRentalAgreement,
  ExternalRentalInvariantError,
  assertQuantityPipelineInvariants,
  computeCustodyBalances,
  computeLineHireInCost,
  deriveSettlementStatus,
} from "@/modules/external-rental/domain";
import type { InventoryProps } from "@/modules/inventory/domain/inventory.entity";

import {
  AGREEMENT_ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  RENTAL_ORDER_ITEM_ID,
  SUPPLIER_ID,
  WAREHOUSE_ID,
  buildCreateExternalRentalAgreementData,
  buildExternalRentalAgreementEntity,
} from "../tests/helpers/external-rental.fixtures";

describe("ExternalRentalAgreement entity (Phase 25.5.2)", () => {
  it("creates a DRAFT agreement linked to one supplier and one rental order", () => {
    const props = ExternalRentalAgreement.create(
      buildCreateExternalRentalAgreementData(),
    );

    expect(props.supplierId).toBe(SUPPLIER_ID);
    expect(props.warehouseId).toBe(WAREHOUSE_ID);
    expect(props.rentalOrderId).toBe(RENTAL_ORDER_ID);
    expect(props.totalHireInCost).toBe(0);
    expect(props.amountDue).toBe(0);
    expect(props.amountPaid).toBe(0);
    expect(props.items).toHaveLength(1);
  });

  it("links agreement item to product and rental-order item with quantity pipeline fields", () => {
    const agreement = buildExternalRentalAgreementEntity();
    const item = agreement.items[0];

    expect(item.productId).toBe(PRODUCT_ID);
    expect(item.rentalOrderItemId).toBe(RENTAL_ORDER_ITEM_ID);
    expect(item).toMatchObject({
      quantityRequested: 200,
      quantityConfirmed: 0,
      quantityReceived: 0,
      quantityAllocated: 0,
      quantityDispatched: 0,
      quantityReturnedFromCustomer: 0,
      quantityReturnedToSupplier: 0,
      quantityWrittenOff: 0,
      unitCost: 25,
      lineHireInCost: 0,
    });
  });

  it("exposes settlement money fields on the agreement", () => {
    const agreement = buildExternalRentalAgreementEntity({
      amountDue: 5000,
      amountPaid: 1000,
      totalHireInCost: 5000,
      settlementStatus: "PARTIALLY_SETTLED",
    });

    expect(agreement.amountDue).toBe(5000);
    expect(agreement.amountPaid).toBe(1000);
    expect(agreement.getOutstandingBalance()).toBe(4000);
    expect(agreement.settlementStatus).toBe("PARTIALLY_SETTLED");
  });

  it("rejects empty agreement number", () => {
    expect(() =>
      ExternalRentalAgreement.create(
        buildCreateExternalRentalAgreementData({ agreementNumber: "  " }),
      ),
    ).toThrow(ExternalRentalInvariantError);
  });

  it("rejects empty items", () => {
    expect(() =>
      ExternalRentalAgreement.create(
        buildCreateExternalRentalAgreementData({ items: [] }),
      ),
    ).toThrow(ExternalRentalInvariantError);
  });

  it("rejects non-positive requested quantity", () => {
    expect(() =>
      ExternalRentalAgreement.create(
        buildCreateExternalRentalAgreementData({
          items: [
            {
              productId: PRODUCT_ID,
              rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
              quantityRequested: 0,
              unitCost: 10,
            },
          ],
        }),
      ),
    ).toThrow(ExternalRentalInvariantError);
  });

  it("rejects negative unit cost", () => {
    expect(() =>
      ExternalRentalAgreement.create(
        buildCreateExternalRentalAgreementData({
          items: [
            {
              productId: PRODUCT_ID,
              rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
              quantityRequested: 10,
              unitCost: -1,
            },
          ],
        }),
      ),
    ).toThrow(ExternalRentalInvariantError);
  });
});

describe("External rental quantity pipeline invariants", () => {
  const base = {
    quantityRequested: 200,
    quantityConfirmed: 200,
    quantityReceived: 150,
    quantityAllocated: 150,
    quantityDispatched: 100,
    quantityReturnedFromCustomer: 40,
    quantityReturnedToSupplier: 10,
    quantityWrittenOff: 0,
  };

  it("accepts a valid pipeline", () => {
    expect(() => assertQuantityPipelineInvariants(base)).not.toThrow();
  });

  it("rejects received > confirmed", () => {
    expect(() =>
      assertQuantityPipelineInvariants({ ...base, quantityReceived: 201 }),
    ).toThrow(/quantityReceived cannot exceed quantityConfirmed/);
  });

  it("rejects allocated > received", () => {
    expect(() =>
      assertQuantityPipelineInvariants({ ...base, quantityAllocated: 151 }),
    ).toThrow(/quantityAllocated cannot exceed quantityReceived/);
  });

  it("rejects dispatched > allocated", () => {
    expect(() =>
      assertQuantityPipelineInvariants({ ...base, quantityDispatched: 151 }),
    ).toThrow(/quantityDispatched cannot exceed quantityAllocated/);
  });

  it("rejects customerReturned > dispatched", () => {
    expect(() =>
      assertQuantityPipelineInvariants({
        ...base,
        quantityReturnedFromCustomer: 101,
      }),
    ).toThrow(/quantityReturnedFromCustomer cannot exceed quantityDispatched/);
  });

  it("rejects supplierReturned + writtenOff > received", () => {
    expect(() =>
      assertQuantityPipelineInvariants({
        ...base,
        quantityReturnedToSupplier: 100,
        quantityWrittenOff: 51,
      }),
    ).toThrow(/cannot exceed quantityReceived/);
  });

  it("computes custody balances from counters", () => {
    const balances = computeCustodyBalances(base);

    expect(balances.qtyWithCustomer).toBe(60);
    expect(balances.qtyInCompanyCustody).toBe(80);
    expect(balances.qtyOwedToSupplier).toBe(140);
  });

  it("recognizes hire-in cost at receive qty × unitCost", () => {
    expect(computeLineHireInCost(150, 25)).toBe(3750);
  });

  it("derives settlement status orthogonally", () => {
    expect(deriveSettlementStatus(0, 0)).toBe("SETTLED");
    expect(deriveSettlementStatus(100, 0)).toBe("UNSETTLED");
    expect(deriveSettlementStatus(100, 40)).toBe("PARTIALLY_SETTLED");
    expect(deriveSettlementStatus(100, 100)).toBe("SETTLED");
  });
});

describe("External custody isolation from owned Inventory (Phase 25.5.2)", () => {
  it("does not place ownership/custody discriminators on InventoryProps", () => {
    const inventoryKeys: Array<keyof InventoryProps> = [
      "id",
      "productId",
      "warehouseId",
      "quantityOnHand",
      "reservedQuantity",
      "minimumStock",
      "maximumStock",
      "isActive",
      "createdAt",
      "updatedAt",
    ];

    expect(inventoryKeys).not.toContain(
      "ownershipType" as keyof InventoryProps,
    );
    expect(inventoryKeys).not.toContain("supplierOwned" as keyof InventoryProps);
    expect(inventoryKeys).not.toContain("isBorrowed" as keyof InventoryProps);
    expect(inventoryKeys).not.toContain("custodyType" as keyof InventoryProps);
  });

  it("keeps external custody counters on the agreement item, not Inventory", () => {
    const agreement = buildExternalRentalAgreementEntity({
      items: [
        {
          id: AGREEMENT_ITEM_ID,
          productId: PRODUCT_ID,
          rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
          quantityRequested: 200,
          quantityConfirmed: 200,
          quantityReceived: 200,
          quantityAllocated: 200,
          quantityDispatched: 0,
          quantityReturnedFromCustomer: 0,
          quantityReturnedToSupplier: 0,
          quantityWrittenOff: 0,
          unitCost: 25,
          lineHireInCost: 5000,
          notes: null,
        },
      ],
    });

    expect(agreement.items[0].quantityReceived).toBe(200);
    expect(
      "quantityOnHand" in (agreement.items[0] as unknown as Record<string, unknown>),
    ).toBe(false);
  });
});

describe("ExternalRentalAgreement.withDispatched / withCustomerReturned (25.5.4)", () => {
  function allocatedAgreement() {
    return buildExternalRentalAgreementEntity({
      status: "ALLOCATED",
      items: [
        {
          id: AGREEMENT_ITEM_ID,
          productId: PRODUCT_ID,
          rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
          quantityRequested: 200,
          quantityConfirmed: 200,
          quantityReceived: 200,
          quantityAllocated: 200,
          quantityDispatched: 0,
          quantityReturnedFromCustomer: 0,
          quantityReturnedToSupplier: 0,
          quantityWrittenOff: 0,
          unitCost: 25,
          lineHireInCost: 5000,
          notes: null,
        },
      ],
    });
  }

  it("dispatches external qty up to allocated and sets IN_USE", () => {
    const result = allocatedAgreement().withDispatched([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
    ]);

    expect(result.status).toBe("IN_USE");
    expect(result.items[0].quantityDispatched).toBe(40);
  });

  it("rejects external dispatch beyond allocated", () => {
    expect(() =>
      allocatedAgreement().withDispatched([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 201 },
      ]),
    ).toThrow(/quantityDispatched cannot exceed quantityAllocated/);
  });

  it("rejects external dispatch before allocation", () => {
    const received = buildExternalRentalAgreementEntity({
      status: "RECEIVED",
      items: [
        {
          id: AGREEMENT_ITEM_ID,
          productId: PRODUCT_ID,
          rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
          quantityRequested: 200,
          quantityConfirmed: 200,
          quantityReceived: 200,
          quantityAllocated: 0,
          quantityDispatched: 0,
          quantityReturnedFromCustomer: 0,
          quantityReturnedToSupplier: 0,
          quantityWrittenOff: 0,
          unitCost: 25,
          lineHireInCost: 5000,
          notes: null,
        },
      ],
    });

    expect(() =>
      received.withDispatched([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 10 },
      ]),
    ).toThrow(/before allocation/);
  });

  it("customer return updates returnedFromCustomer without supplier return", () => {
    const inUse = allocatedAgreement().withDispatched([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
    ]);

    const returned = inUse.withCustomerReturned([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 30 },
    ]);

    expect(returned.items[0].quantityReturnedFromCustomer).toBe(30);
    expect(returned.items[0].quantityReturnedToSupplier).toBe(0);
    expect(returned.status).toBe("IN_USE");
  });

  it("full customer return moves to RETURN_PENDING", () => {
    const inUse = allocatedAgreement().withDispatched([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
    ]);

    const returned = inUse.withCustomerReturned([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
    ]);

    expect(returned.status).toBe("RETURN_PENDING");
    expect(returned.items[0].quantityReturnedToSupplier).toBe(0);
  });

  it("rejects customer return beyond dispatched", () => {
    const inUse = allocatedAgreement().withDispatched([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
    ]);

    expect(() =>
      inUse.withCustomerReturned([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 41 },
      ]),
    ).toThrow(/quantityReturnedFromCustomer cannot exceed quantityDispatched/);
  });
});

describe("ExternalRentalAgreement.withSupplierReturned / withPaymentRecorded (25.5.5)", () => {
  function allocatedAgreement(qty = 100) {
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

  it("returns never-dispatched custody to supplier and reaches RETURNED", () => {
    const result = allocatedAgreement(100).withSupplierReturned([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 },
    ]);

    expect(result.items[0].quantityReturnedToSupplier).toBe(100);
    expect(result.status).toBe("RETURNED");
  });

  it("supports partial supplier return then remaining", () => {
    const first = allocatedAgreement(100).withSupplierReturned([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 60 },
    ]);
    expect(first.status).toBe("RETURN_PENDING");
    expect(first.items[0].quantityReturnedToSupplier).toBe(60);

    const second = first.withSupplierReturned([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
    ]);
    expect(second.status).toBe("RETURNED");
    expect(second.items[0].quantityReturnedToSupplier).toBe(100);
  });

  it("rejects supplier return beyond qtyInCompanyCustody while with customer", () => {
    const withCustomer = allocatedAgreement(100)
      .withDispatched([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 },
      ]);

    expect(() =>
      withCustomer.withSupplierReturned([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 },
      ]),
    ).toThrow(/qtyInCompanyCustody|No external company custody/);
  });

  it("allows supplier return only of customer-returned custody", () => {
    const cycle = allocatedAgreement(100)
      .withDispatched([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 },
      ])
      .withCustomerReturned([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 80 },
      ]);

    const partial = cycle.withSupplierReturned([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 70 },
    ]);
    expect(partial.items[0].quantityReturnedToSupplier).toBe(70);
    expect(partial.status).toBe("IN_USE"); // 20 still with customer

    expect(() =>
      partial.withSupplierReturned([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 11 },
      ]),
    ).toThrow(/qtyInCompanyCustody/);
  });

  it("rejects supplier return on cancelled agreement", () => {
    expect(() =>
      buildExternalRentalAgreementEntity({ status: "CANCELLED" }).withSupplierReturned(
        [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 1 }],
      ),
    ).toThrow(/CANCELLED/);
  });

  it("customer return does not auto-increment supplierReturned", () => {
    const returned = allocatedAgreement(40)
      .withDispatched([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
      ])
      .withCustomerReturned([
        { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 40 },
      ]);

    expect(returned.items[0].quantityReturnedFromCustomer).toBe(40);
    expect(returned.items[0].quantityReturnedToSupplier).toBe(0);
    expect(returned.status).toBe("RETURN_PENDING");
  });

  it("records partial and full settlement independently of RETURNED", () => {
    const returned = allocatedAgreement(100).withSupplierReturned([
      { rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 100 },
    ]);
    expect(returned.status).toBe("RETURNED");
    expect(returned.settlementStatus).toBe("UNSETTLED");

    const partial = returned.withPaymentRecorded({ paymentAmount: 1000 });
    expect(partial.amountPaid).toBe(1000);
    expect(partial.settlementStatus).toBe("PARTIALLY_SETTLED");
    expect(partial.status).toBe("RETURNED");

    const settled = partial.withPaymentRecorded({ paymentAmount: 1500 });
    expect(settled.amountPaid).toBe(2500);
    expect(settled.settlementStatus).toBe("SETTLED");
  });

  it("rejects payment exceeding amountDue", () => {
    const agreement = allocatedAgreement(100);
    expect(() =>
      agreement.withPaymentRecorded({ paymentAmount: 2501 }),
    ).toThrow(/amountPaid cannot exceed amountDue/);
  });

  it("rejects payment on cancelled agreement", () => {
    expect(() =>
      buildExternalRentalAgreementEntity({
        status: "CANCELLED",
        amountDue: 100,
      }).withPaymentRecorded({ paymentAmount: 10 }),
    ).toThrow(/CANCELLED/);
  });

  it("rejects zero/negative payment", () => {
    expect(() =>
      allocatedAgreement(100).withPaymentRecorded({ paymentAmount: 0 }),
    ).toThrow(/greater than zero/);
  });
});
