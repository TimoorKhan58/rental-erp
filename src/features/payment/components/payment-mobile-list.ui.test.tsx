import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PaymentMobileList } from "./payment-mobile-list";
import type { PaymentResponse } from "../types";

const payment: PaymentResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  paymentNumber: "PAY-1001",
  customerId: "00000000-0000-4000-8000-000000000002",
  rentalInvoiceId: "00000000-0000-4000-8000-000000000003",
  paymentDate: "2026-09-01",
  paymentMethod: "CASH",
  amount: 1500,
  status: "PENDING",
  referenceNumber: "REF-9",
  notes: null,
  postedAt: null,
  voidedAt: null,
  createdById: "00000000-0000-4000-8000-000000000004",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("PaymentMobileList", () => {
  it("renders payment number, customer, invoice, and view details for operators", () => {
    const html = renderToStaticMarkup(
      <PaymentMobileList
        rows={[payment]}
        resolveCustomerName={() => "CUS-01 — Example Customer"}
        resolveInvoiceLabel={() => "INV-2001"}
        canUpdate
        canPost
        canVoid
        onPost={() => undefined}
        onVoid={() => undefined}
      />,
    );

    expect(html).toContain("PAY-1001");
    expect(html).toContain("/payments/00000000-0000-4000-8000-000000000001");
    expect(html).toContain("CUS-01 — Example Customer");
    expect(html).toContain("INV-2001");
    expect(html).toContain("Pending");
    expect(html).toContain("Actions for PAY-1001");
  });

  it("keeps a detail link available on voided payments", () => {
    const html = renderToStaticMarkup(
      <PaymentMobileList
        rows={[{ ...payment, status: "VOID" }]}
        resolveCustomerName={() => "CUS-01 — Example Customer"}
        resolveInvoiceLabel={() => "INV-2001"}
        canUpdate
        canPost
        canVoid
        onPost={() => undefined}
        onVoid={() => undefined}
      />,
    );

    expect(html).toContain("/payments/00000000-0000-4000-8000-000000000001");
    expect(html).toContain("Void");
    expect(html).toContain("Actions for PAY-1001");
  });
});
