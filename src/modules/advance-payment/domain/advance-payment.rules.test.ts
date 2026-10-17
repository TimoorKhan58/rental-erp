import { describe, expect, it } from "vitest";
import {
  allocateAdvanceToInvoice,
  assertAdvanceBalance,
  assertAdvanceOrderAndCustomer,
  availableAdvanceAmount,
} from "./advance-payment.rules";

describe("booking advance settlement", () => {
  const advance = { amount: 3000, appliedAmount: 0, refundedAmount: 0, status: "POSTED" as const };

  it("applies an advance against the final invoice", () => {
    expect(allocateAdvanceToInvoice(advance, 10000)).toBe(3000);
  });

  it("never applies more than the remaining invoice balance", () => {
    expect(allocateAdvanceToInvoice(advance, 2000)).toBe(2000);
  });

  it("does not apply pending or void advances", () => {
    expect(availableAdvanceAmount({ ...advance, status: "PENDING" })).toBe(0);
    expect(availableAdvanceAmount({ ...advance, status: "VOID" })).toBe(0);
  });

  it("does not apply already allocated or refunded amounts again", () => {
    expect(allocateAdvanceToInvoice({ ...advance, appliedAmount: 1000, refundedAmount: 500 }, 5000)).toBe(1500);
  });

  it("rejects settlement beyond the received amount", () => {
    expect(() => assertAdvanceBalance({ ...advance, appliedAmount: 2500, refundedAmount: 1000 })).toThrow();
  });

  it("rejects settlement of pending advances", () => {
    expect(() => assertAdvanceBalance({ ...advance, status: "PENDING", appliedAmount: 1 })).toThrow();
  });

  it("rejects mismatched order or customer", () => {
    expect(() => assertAdvanceOrderAndCustomer("order-1", "customer-1", "order-2", "customer-1")).toThrow();
    expect(() => assertAdvanceOrderAndCustomer("order-1", "customer-1", "order-1", "customer-2")).toThrow();
  });

  it("rejects invalid monetary precision", () => {
    expect(() => allocateAdvanceToInvoice(advance, 10.001)).toThrow();
  });
});
