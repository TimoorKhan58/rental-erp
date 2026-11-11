import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { DispatchMobileList } from "./dispatch-mobile-list";
import type { DispatchResponse } from "../types";

const dispatch: DispatchResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  dispatchNumber: "DSP-1001",
  rentalOrderId: "00000000-0000-4000-8000-000000000002",
  dispatchDate: "2026-09-12",
  deliveryMethod: "DELIVERY",
  vehicleNumber: "LEA-12",
  driverName: "Imran",
  driverPhone: "03001234567",
  deliveryAddress: "Warehouse gate",
  remarks: null,
  status: "READY",
  readyAt: "2026-09-12T00:00:00.000Z",
  dispatchedAt: null,
  completedAt: null,
  items: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      productId: "00000000-0000-4000-8000-000000000004",
      rentalOrderItemId: null,
      quantity: 4,
      ownedQuantity: 4,
      externalQuantity: 0,
      notes: null,
    },
  ],
  createdById: "00000000-0000-4000-8000-000000000005",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("DispatchMobileList", () => {
  it("renders dispatch number, order, customer, and status text", () => {
    const html = renderToStaticMarkup(
      <DispatchMobileList
        rows={[dispatch]}
        resolveOrderLabel={() => "RO-2001"}
        resolveCustomerName={() => "Ayesha Khan"}
        canUpdate
        canComplete
        canCancel
        onMarkReady={() => undefined}
        onComplete={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).toContain("DSP-1001");
    expect(html).toContain("RO-2001");
    expect(html).toContain("Ayesha Khan");
    expect(html).toContain("Ready");
    expect(html).toContain("/dispatches/00000000-0000-4000-8000-000000000001");
  });
});
