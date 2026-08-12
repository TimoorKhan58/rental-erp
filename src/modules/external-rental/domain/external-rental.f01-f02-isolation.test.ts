import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as availabilityRules from "@/modules/rental-order/domain/rental-order.availability.rules";

/**
 * Phase 25.5.2 safety guardrails:
 * - F-02 owned availability remains the sole capacity math surface.
 * - External hire-in must not appear in availability exports.
 * - RentalOrderItem.reservedQuantity remains owned-only in schema comments/model.
 */
describe("Phase 25.5.2 F-01/F-02 external-rental isolation guardrails", () => {
  it("F-02 availability surface has no external-rental / borrow APIs", () => {
    const exported = availabilityRules as Record<string, unknown>;

    expect("borrowInventory" in exported).toBe(false);
    expect("externalRental" in exported).toBe(false);
    expect("hireIn" in exported).toBe(false);
    expect("calculateDateAwareAvailabilitySnapshot" in exported).toBe(true);
    expect(availabilityRules.AVAILABILITY_COMMITMENT_STATUSES).toEqual([
      "RESERVED",
      "ON_RENT",
      "PARTIALLY_RETURNED",
    ]);
  });

  it("F-02 snapshot input still keys capacity off quantityOnHand only", () => {
    const snapshot = availabilityRules.calculateDateAwareAvailabilitySnapshot({
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
    expect(snapshot).not.toHaveProperty("externalQuantity");
  });

  it("Prisma Inventory model has no ownership discriminator fields", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );
    const inventoryBlock = schema.match(
      /model Inventory \{[\s\S]*?\n\}/,
    )?.[0];

    expect(inventoryBlock).toBeTruthy();
    expect(inventoryBlock).toContain("quantityOnHand");
    expect(inventoryBlock).toContain("reservedQuantity");
    expect(inventoryBlock).not.toMatch(/ownershipType|supplierOwned|isBorrowed|custodyType/);
  });

  it("Prisma schema isolates external rental tables from Inventory", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );

    expect(schema).toContain("model ExternalRentalAgreement");
    expect(schema).toContain("model ExternalRentalAgreementItem");
    expect(schema).toContain("quantityReturnedFromCustomer");
    expect(schema).toContain("quantityReturnedToSupplier");
    expect(schema).toContain("rentalOrderId                String                         @unique");
    expect(schema).toMatch(
      /\/\/ OWNED-STOCK reservation only \(F-01\)\. External hire-in qty is NOT stored here\./,
    );
  });

  it("PurchaseOrder model is not extended as hire-in", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );
    const poBlock = schema.match(/model PurchaseOrder \{[\s\S]*?\n\}/)?.[0];

    expect(poBlock).toBeTruthy();
    expect(poBlock).not.toMatch(/hireIn|externalRental|BORROW|RENT_IN/);
  });
});
