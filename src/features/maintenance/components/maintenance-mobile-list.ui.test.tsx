import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MaintenanceMobileList } from "./maintenance-mobile-list";
import type { MaintenanceResponse } from "../types";

const maintenance: MaintenanceResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  maintenanceNumber: "MNT-1001",
  productId: "00000000-0000-4000-8000-000000000002",
  warehouseId: "00000000-0000-4000-8000-000000000003",
  inventoryId: "00000000-0000-4000-8000-000000000004",
  quantity: 4,
  serviceType: "PREVENTIVE",
  technician: "Imran",
  vendor: null,
  scheduledDate: "2026-09-12",
  startedAt: null,
  completedAt: null,
  estimatedCost: 180,
  actualCost: 0,
  notes: null,
  status: "SCHEDULED",
  createdById: "00000000-0000-4000-8000-000000000005",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("MaintenanceMobileList", () => {
  it("renders maintenance number, product, service type, and status", () => {
    const html = renderToStaticMarkup(
      <MaintenanceMobileList
        rows={[maintenance]}
        resolveProductLabel={() => "TENT-10 — Marquee"}
        canUpdate
        canStart
        canComplete
        canCancel
        onStart={() => undefined}
        onComplete={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).toContain("MNT-1001");
    expect(html).toContain("TENT-10 — Marquee");
    expect(html).toContain("Preventive");
    expect(html).toContain("4 units");
    expect(html).toContain("Scheduled");
    expect(html).toContain("/maintenance/00000000-0000-4000-8000-000000000001");
  });
});
