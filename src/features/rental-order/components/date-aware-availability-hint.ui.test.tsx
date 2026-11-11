import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { DateAwareAvailabilityHint } from "./date-aware-availability-hint";

const BASE_DATA = {
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
  bookableQuantity: 5,
  heldForOtherDatesQuantity: 0,
};

const availability = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));

vi.mock("../hooks", () => ({
  useDateAwareAvailability: () => ({
    isLoading: false,
    isError: false,
    data: availability.data,
  }),
}));

const productId = "00000000-0000-4000-8000-00000000000a";
const warehouseId = "00000000-0000-4000-8000-00000000000b";
const startDate = "2026-09-01";
const endDate = "2026-09-05";

function render(requestedQuantity: number) {
  return renderToStaticMarkup(
    <DateAwareAvailabilityHint
      productId={productId}
      warehouseId={warehouseId}
      startDate={startDate}
      endDate={endDate}
      requestedQuantity={requestedQuantity}
    />,
  );
}

describe("DateAwareAvailabilityHint", () => {
  beforeEach(() => {
    availability.data = { ...BASE_DATA };
  });

  it("shows 'Available N' regardless of shortage state and adds 'Short by' when requested > available", () => {
    const html = render(10);

    expect(html).toContain("Available 5");
    expect(html).toContain("Short by 5");
    // Never render the old ambiguous "Shortage {available}" label.
    expect(html).not.toMatch(/Shortage\s+5/);
    expect(html).toContain("Requested 10; only 5 available for these dates.");
  });

  it("shows only 'Available N' when the request is fulfillable", () => {
    const html = render(3);

    expect(html).toContain("Available 5");
    expect(html).not.toContain("Short by");
    expect(html).toContain("For selected rental dates (authoritative)");
    expect(html).not.toContain("held by bookings on other dates");
  });

  it("shows the bookable limit and explains units held for other dates (QA-009)", () => {
    availability.data = {
      ...BASE_DATA,
      quantityOnHand: 200,
      reservedQuantity: 10,
      dateAwareCommittedQuantity: 0,
      dateAwareAvailableQuantity: 200,
      bookableQuantity: 190,
      heldForOtherDatesQuantity: 10,
    };

    const html = render(195);

    expect(html).toContain("Available 190");
    expect(html).toContain("Short by 5");
    expect(html).toContain("10 more are free on these dates but held by bookings");
  });
});
