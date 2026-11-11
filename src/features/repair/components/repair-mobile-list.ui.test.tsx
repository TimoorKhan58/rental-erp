import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { RepairMobileList } from "./repair-mobile-list";
import type { RepairResponse } from "../types";

const repair: RepairResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  repairNumber: "REP-1001",
  returnId: "00000000-0000-4000-8000-000000000002",
  returnItemId: "00000000-0000-4000-8000-000000000003",
  productId: "00000000-0000-4000-8000-000000000004",
  warehouseId: "00000000-0000-4000-8000-000000000005",
  quantity: 3,
  repairCost: 250,
  repairNotes: null,
  technician: "Imran",
  repairDate: "2026-09-12",
  status: "PENDING",
  startedAt: null,
  completedAt: null,
  createdById: "00000000-0000-4000-8000-000000000006",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("RepairMobileList", () => {
  it("leads with product, then repair number and return", () => {
    const html = renderToStaticMarkup(
      <RepairMobileList
        rows={[repair]}
        resolveProductLabel={() => "TENT-10 — Marquee"}
        resolveReturnLabel={() => "RET-1001"}
        canUpdate
        canStart
        canComplete
        canCancel
        onStart={() => undefined}
        onComplete={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).toContain("REP-1001");
    expect(html).toContain("TENT-10 — Marquee");
    expect(html).toContain("RET-1001");
    expect(html).toContain("3 units");
    expect(html).toContain("Pending");
    expect(html).toContain("/repairs/00000000-0000-4000-8000-000000000001");
  });
});
