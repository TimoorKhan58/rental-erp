import { describe, expect, it } from "vitest";
import { canEditPayment, canPostPayment, canVoidPayment } from "./payment-status.mapper";

describe("payment status action gating", () => {
  it("allows edit and post only while pending", () => {
    expect(canEditPayment("PENDING")).toBe(true);
    expect(canPostPayment("PENDING")).toBe(true);
    expect(canEditPayment("POSTED")).toBe(false);
    expect(canPostPayment("POSTED")).toBe(false);
    expect(canEditPayment("VOID")).toBe(false);
    expect(canPostPayment("VOID")).toBe(false);
  });

  it("allows void for pending and posted, but not already voided", () => {
    expect(canVoidPayment("PENDING")).toBe(true);
    expect(canVoidPayment("POSTED")).toBe(true);
    expect(canVoidPayment("VOID")).toBe(false);
  });
});
