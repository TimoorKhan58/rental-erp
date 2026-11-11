import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ExpenseMobileList } from "./expense-mobile-list";
import type { ExpenseResponse } from "../types";

const expense: ExpenseResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  expenseNumber: "EXP-1001",
  expenseDate: "2026-09-12",
  categoryId: "00000000-0000-4000-8000-000000000002",
  expenseType: "MANUAL",
  status: "APPROVED",
  amount: 2500,
  paymentMethod: "CASH",
  supplierId: null,
  vendorName: "Local hardware",
  description: "Generator fuel",
  notes: null,
  attachmentRef: null,
  referenceNumber: "INV-9",
  rejectionReason: null,
  submittedAt: "2026-09-10T00:00:00.000Z",
  approvedAt: "2026-09-11T00:00:00.000Z",
  rejectedAt: null,
  paidAt: null,
  journalEntryId: null,
  recordedById: "00000000-0000-4000-8000-000000000003",
  approvedById: "00000000-0000-4000-8000-000000000004",
  paidById: null,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
};

describe("ExpenseMobileList", () => {
  it("renders expense number, vendor, category, amount, and status", () => {
    const html = renderToStaticMarkup(
      <ExpenseMobileList
        rows={[expense]}
        resolveCategoryLabel={() => "Fuel"}
        resolveVendorLabel={() => "Local hardware"}
        canUpdate
        canApprove
        canReject
        canPay
        onSubmit={() => undefined}
        onApprove={() => undefined}
        onReject={() => undefined}
        onPay={() => undefined}
      />,
    );

    expect(html).toContain("EXP-1001");
    expect(html).toContain("Local hardware");
    expect(html).toContain("Fuel");
    expect(html).toContain("Generator fuel");
    expect(html).toContain("Approved");
    expect(html).toContain("/expenses/00000000-0000-4000-8000-000000000001");
  });
});
