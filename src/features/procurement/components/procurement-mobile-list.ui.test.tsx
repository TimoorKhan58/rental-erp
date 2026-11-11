import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ProcurementMobileList } from "./procurement-mobile-list";
import type { ProcurementResponse } from "../types";

const procurement: ProcurementResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  poNumber: "PO-1001",
  supplierId: "00000000-0000-4000-8000-000000000002",
  warehouseId: "00000000-0000-4000-8000-000000000003",
  status: "APPROVED",
  orderDate: "2026-09-12",
  expectedDate: null,
  remarks: null,
  orderTotal: 1500,
  paidAmount: 0,
  balance: 1500,
  items: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      productId: "00000000-0000-4000-8000-000000000005",
      quantity: 10,
      unitCost: 150,
      receivedQuantity: 0,
    },
  ],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("ProcurementMobileList", () => {
  it("renders PO number, supplier, warehouse, received qty, and status", () => {
    const html = renderToStaticMarkup(
      <ProcurementMobileList
        rows={[procurement]}
        resolveSupplierLabel={() => "SUP-01 — Canvas Co"}
        resolveWarehouseLabel={() => "WH-01 — Main"}
        canUpdate
        canApprove
        canReceive
        canCancel
        onApprove={() => undefined}
        onReceive={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).toContain("PO-1001");
    expect(html).toContain("SUP-01 — Canvas Co");
    expect(html).toContain("WH-01 — Main");
    expect(html).toContain("Received 0 / 10");
    expect(html).toContain("Approved");
    expect(html).toContain("/procurements/00000000-0000-4000-8000-000000000001");
  });
});
