import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { DateAwareAvailabilityHint } from "./date-aware-availability-hint";

vi.mock("../hooks", () => ({
  useDateAwareAvailability: () => ({
    isLoading: false,
    isError: false,
    data: {
      productId: "00000000-0000-4000-8000-000000000000",
      warehouseId: "00000000-0000-4000-8000-000000000001",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      quantityOnHand: 20,
      reservedQuantity: 6,
      currentAvailableQuantity: 5,
      outstandingOutQuantity: 3,
      baseCapacity: 20,
      dateAwareCommittedQuantity: 15,
      dateAwareAvailableQuantity: 5,
    },
  }),
}));

const productId = "00000000-0000-4000-8000-00000000000a";
const warehouseId = "00000000-0000-4000-8000-00000000000b";
const startDate = "2026-09-01";
const endDate = "2026-09-05";

describe("DateAwareAvailabilityHint", () => {
  it("shows 'Available N' regardless of shortage state and adds 'Short by' when requested > available", () => {
    const html = renderToStaticMarkup(
      <DateAwareAvailabilityHint
        productId={productId}
        warehouseId={warehouseId}
        startDate={startDate}
        endDate={endDate}
        requestedQuantity={10}
      />,
    );

    expect(html).toContain("Available 5");
    expect(html).toContain("Short by 5");
    // Never render the old ambiguous "Shortage {available}" label.
    expect(html).not.toMatch(/Shortage\s+5/);
    expect(html).toContain("Requested 10; only 5 available for these dates.");
  });

  it("shows only 'Available N' when the request is fulfillable", () => {
    const html = renderToStaticMarkup(
      <DateAwareAvailabilityHint
        productId={productId}
        warehouseId={warehouseId}
        startDate={startDate}
        endDate={endDate}
        requestedQuantity={3}
      />,
    );

    expect(html).toContain("Available 5");
    expect(html).not.toContain("Short by");
    expect(html).toContain("For selected rental dates (authoritative)");
  });
});
