import { describe, expect, it } from "vitest";

import { getDispatchNextStep } from "@/features/dispatch/mappers/dispatch-next-step";
import { getPaymentNextStep } from "@/features/payment/mappers/payment-next-step";
import { getRentalInvoiceNextStep } from "@/features/rental-invoice/mappers/rental-invoice-next-step";
import { getReturnNextStep } from "@/features/return/mappers/return-next-step";

describe("next step on dispatches, returns, invoices and payments (usability revamp R3b)", () => {
  it("dispatch: ready, then sent, then record the return", () => {
    expect(getDispatchNextStep({ status: "DRAFT", rentalOrderId: "o1" }).action?.label).toBe("Mark ready");
    expect(getDispatchNextStep({ status: "READY", rentalOrderId: "o1" }).action?.label).toBe("Mark as sent");
    expect(getDispatchNextStep({ status: "COMPLETED", rentalOrderId: "o1" }).action).toMatchObject({
      href: "/returns/new?rentalOrderId=o1",
    });
    expect(getDispatchNextStep({ status: "CANCELLED", rentalOrderId: "o1" }).action).toBeUndefined();
  });

  it("return: receive, check, finish, then bill", () => {
    const labels = (["DRAFT", "RECEIVED", "INSPECTED", "COMPLETED"] as const).map(
      (status) => getReturnNextStep({ status, rentalOrderId: "o1" }).action?.label,
    );
    expect(labels).toEqual(["Mark received", "Check items", "Finish return", "Open order"]);
  });

  it("invoice: issue, collect (red once overdue), then paid", () => {
    const base = { id: "i1", customerId: "c1", balance: 1500, dueDate: "2026-11-10T00:00:00.000Z" };
    expect(getRentalInvoiceNextStep({ ...base, status: "DRAFT" }, "2026-11-18").action?.label).toBe("Issue invoice");
    const due = getRentalInvoiceNextStep({ ...base, status: "ISSUED" }, "2026-11-18");
    expect(due.tone).toBe("urgent");
    expect(due.title).toMatch(/1,500.* still to collect/);
    expect(getRentalInvoiceNextStep({ ...base, status: "ISSUED" }, "2026-11-05").tone).toBe("normal");
    expect(getRentalInvoiceNextStep({ ...base, status: "PAID", balance: 0 }, "2026-11-18").title).toBe("Paid in full");
  });

  it("payment: post, then done", () => {
    expect(getPaymentNextStep({ status: "PENDING" }).action?.label).toBe("Post payment");
    expect(getPaymentNextStep({ status: "POSTED" }).action).toBeUndefined();
  });
});
