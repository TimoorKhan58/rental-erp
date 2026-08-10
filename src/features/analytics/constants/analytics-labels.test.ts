import { describe, expect, it } from "vitest";

import {
  ANALYTICS_METRIC_LABELS,
  ANALYTICS_SCOPE_HINTS,
  FORBIDDEN_ANALYTICS_LABELS,
} from "./analytics-labels";

describe("analytics metric labels (frozen vocabulary)", () => {
  it("exposes only qualified revenue labels", () => {
    expect(ANALYTICS_METRIC_LABELS.bookedRentalValue).toBe("Booked Rental Value");
    expect(ANALYTICS_METRIC_LABELS.billedRevenue).toBe("Billed Revenue");
    expect(ANALYTICS_METRIC_LABELS.collectedCash).toBe("Collected Cash");
    expect(ANALYTICS_METRIC_LABELS.recognizedRevenue).toBe(
      "Recognized Revenue",
    );
  });

  it("clarifies bookingDate as event-start envelope", () => {
    expect(ANALYTICS_SCOPE_HINTS.bookedRentalValueDate).toBe(
      "Selected period · event-start (booking date)",
    );
    expect(ANALYTICS_SCOPE_HINTS.bookedRentalValueDate).not.toMatch(
      /created|creation/i,
    );
  });

  it("clarifies completed rentals are not period-filtered", () => {
    expect(ANALYTICS_SCOPE_HINTS.completedRentals).toBe(
      "Current snapshot · all completed",
    );
  });

  it("does not include forbidden misleading KPI labels", () => {
    const displayed = Object.values(ANALYTICS_METRIC_LABELS);
    for (const forbidden of FORBIDDEN_ANALYTICS_LABELS) {
      expect(displayed).not.toContain(forbidden);
    }
  });

  it("keeps maintenance concepts separate", () => {
    expect(ANALYTICS_METRIC_LABELS.assetsUnderMaintenance).toBe(
      "Assets Under Maintenance",
    );
    expect(ANALYTICS_METRIC_LABELS.rentalMaintenanceJobs).toBe(
      "Rental Maintenance Jobs",
    );
    expect(ANALYTICS_METRIC_LABELS.repairJobs).toBe("Repair Jobs");
  });

  it("exposes inventory without rented quantity", () => {
    expect(ANALYTICS_METRIC_LABELS.availableQuantity).toBe("Available Quantity");
    expect(ANALYTICS_METRIC_LABELS.reservedQuantity).toBe("Reserved Quantity");
    expect(
      Object.values(ANALYTICS_METRIC_LABELS).some((label) =>
        /rented|on.?rent/i.test(label),
      ),
    ).toBe(false);
  });
});
