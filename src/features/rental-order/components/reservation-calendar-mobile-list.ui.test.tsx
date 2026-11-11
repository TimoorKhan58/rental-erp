import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ReservationCalendarMobileList } from "./reservation-calendar-mobile-list";
import type { CalendarOrderEvent } from "../utils/reservation-calendar.utils";

const event: CalendarOrderEvent = {
  id: "00000000-0000-4000-8000-000000000001",
  orderNumber: "RO-1001",
  customerId: "00000000-0000-4000-8000-000000000002",
  customerLabel: "Ayesha Khan",
  status: "RESERVED",
  start: new Date(2026, 8, 10),
  end: new Date(2026, 8, 12),
};

describe("ReservationCalendarMobileList", () => {
  it("renders order number, customer, and status text for a busy day", () => {
    const html = renderToStaticMarkup(
      <ReservationCalendarMobileList days={[new Date(2026, 8, 10)]} events={[event]} />,
    );

    expect(html).toContain("RO-1001");
    expect(html).toContain("Ayesha Khan");
    expect(html).toContain("Reserved");
    expect(html).toContain("/rental-orders/00000000-0000-4000-8000-000000000001");
  });
});
