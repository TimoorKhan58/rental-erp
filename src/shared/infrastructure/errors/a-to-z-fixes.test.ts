import { describe, expect, it } from "vitest";

import { assertTrustedOrigin } from "@/shared/infrastructure/http/authenticate-api-request";
import { mapPrismaError } from "@/shared/infrastructure/database/prisma-error-mapper";
import { assertBookable } from "@/modules/rental-order/application/services/assert-bookable";
import { conditionPricesFromInvoice } from "@/modules/rental-invoice/application/services/build-rental-invoice-lines";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";

import { getScopeUserId, runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { normalizeError } from "./error-handler";
import { IN_USE_MESSAGE } from "./driver-adapter-error";

function driverError(kind: string, originalCode: string, message: string) {
  const error = new Error(message) as Error & { cause: unknown };
  error.name = "DriverAdapterError";
  error.cause = { kind, originalCode, originalMessage: message };
  return error;
}

describe("A-to-Z test fixes (2026-11-19)", () => {
  it("deleting a record that is still in use is a clear 409, not a 500", () => {
    const error = driverError(
      "ForeignKeyConstraintViolation",
      "23503",
      'update or delete on table "customers" violates RESTRICT setting of foreign key constraint "payments_customerId_fkey" on table "payments"',
    );
    for (const mapped of [mapPrismaError(error), normalizeError(error)]) {
      expect(mapped).toMatchObject({ httpStatus: 409, message: IN_USE_MESSAGE });
    }
  });

  it("a duplicate value from the database driver is a 409", () => {
    expect(normalizeError(driverError("UniqueConstraintViolation", "23505", "duplicate key"))).toMatchObject({ httpStatus: 409 });
  });

  it("a body that is not valid JSON is a 400", () => {
    let parseError: unknown;
    try { JSON.parse("{ name: 'x'"); } catch (error) { parseError = error; }
    expect(normalizeError(parseError)).toMatchObject({ httpStatus: 400 });
  });

  it("refuses changes sent from another website, allows our own and reads", () => {
    expect(() => assertTrustedOrigin("https://evil.example", "POST")).toThrow(/another website/);
    expect(() => assertTrustedOrigin("https://evil.example", "GET")).not.toThrow();
    expect(() => assertTrustedOrigin(null, "POST")).not.toThrow();
    expect(() => assertTrustedOrigin(process.env.APP_URL ?? "http://localhost:3000", "POST")).not.toThrow();
  });

  it("an inactive customer or product cannot be booked", async () => {
    const db = {
      customer: { findUnique: async () => ({ isActive: false, name: "Old Customer" }) },
      product: { findMany: async () => [{ name: "Broken Tent" }] },
    } as unknown as DbClient;
    await expect(assertBookable(db, { customerId: "c1" })).rejects.toThrow(/Old Customer is inactive/);
    await expect(assertBookable(db, { productIds: ["p1"] })).rejects.toThrow(/Broken Tent is inactive/);
    await expect(assertBookable(db, {})).resolves.toBeUndefined();
  });

  it("converting missing items keeps the damage and loss prices already on the invoice", () => {
    const rentalOrder = { items: [{ id: "oi-1", productId: "p-1" }] } as never;
    const overrides = conditionPricesFromInvoice({
      rentalOrder,
      productNameById: new Map([["p-1", "QA Chair"]]),
      invoiceItems: [
        { lineType: "RENTAL_CHARGE", productName: "QA Chair", unitPrice: 50 },
        { lineType: "DAMAGE_CHARGE", productName: "QA Chair", unitPrice: 200 },
        { lineType: "LOST_ITEM_CHARGE", productName: "QA Chair", unitPrice: 900 },
      ],
    });
    expect(overrides).toEqual([{ rentalOrderItemId: "oi-1", damageUnitPrice: 200, lossUnitPrice: 900 }]);
  });

  it("the signed-in user is available to the activity log during the request's work", async () => {
    expect(getScopeUserId()).toBeUndefined();
    const seen = await runInOrganization("org-1", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return getScopeUserId();
    }, { userId: "user-7" });
    expect(seen).toBe("user-7");
  });
});
