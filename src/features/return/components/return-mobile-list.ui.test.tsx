import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ReturnMobileList } from "./return-mobile-list";
import type { ReturnResponse } from "../types";

const returnRecord: ReturnResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  returnNumber: "RET-1001",
  rentalOrderId: "00000000-0000-4000-8000-000000000002",
  dispatchId: "00000000-0000-4000-8000-000000000003",
  returnDate: "2026-09-12",
  remarks: null,
  status: "RECEIVED",
  receivedAt: "2026-09-12T00:00:00.000Z",
  inspectedAt: null,
  completedAt: null,
  items: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      rentalOrderItemId: "00000000-0000-4000-8000-000000000005",
      dispatchItemId: "00000000-0000-4000-8000-000000000006",
      returnedQuantity: 6,
      ownedQuantity: 6,
      externalQuantity: 0,
      goodQuantity: 0,
      damagedQuantity: 0,
      lostQuantity: 0,
      missingQuantity: 0,
      ownedGoodQuantity: 0,
      ownedDamagedQuantity: 0,
      ownedLostQuantity: 0,
      externalGoodQuantity: 0,
      externalDamagedQuantity: 0,
      externalLostQuantity: 0,
      notes: null,
    },
  ],
  createdById: "00000000-0000-4000-8000-000000000007",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("ReturnMobileList", () => {
  it("renders return number, order, dispatch, units, and status text", () => {
    const html = renderToStaticMarkup(
      <ReturnMobileList
        rows={[returnRecord]}
        resolveOrderLabel={() => "RO-2001"}
        resolveDispatchLabel={() => "DSP-1001"}
        canUpdate
        canReceive
        canInspect
        canComplete
        canCancel
        onReceive={() => undefined}
        onInspect={() => undefined}
        onComplete={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).toContain("RET-1001");
    expect(html).toContain("RO-2001");
    expect(html).toContain("DSP-1001");
    expect(html).toContain("6 units");
    expect(html).toContain("Received");
    expect(html).toContain("/returns/00000000-0000-4000-8000-000000000001");
  });
});
