import { describe, expect, it } from "vitest";

function hasPostedPayments(payments: Array<{ status: string }>): boolean {
  return payments.some((payment) => payment.status === "POSTED");
}

describe("posted-payment void presentation helper", () => {
  it("detects posted payments that block void presentation", () => {
    expect(
      hasPostedPayments([
        { status: "PENDING" },
        { status: "POSTED" },
        { status: "VOID" },
      ]),
    ).toBe(true);
  });

  it("allows void presentation when only pending/void payments exist", () => {
    expect(hasPostedPayments([{ status: "PENDING" }, { status: "VOID" }])).toBe(false);
  });
});
