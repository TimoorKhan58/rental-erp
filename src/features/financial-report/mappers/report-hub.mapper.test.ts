import { describe, expect, it } from "vitest";

import { REPORT_HUB_CARDS } from "./report-hub.mapper";

describe("REPORT_HUB_CARDS", () => {
  it("describes the expenses report as posted journal accounts", () => {
    const expenses = REPORT_HUB_CARDS.find((card) => card.title === "Expenses");
    expect(expenses?.description).toMatch(/posted journal/i);
    expect(expenses?.description).not.toMatch(/repairs, transport, overhead/i);
  });

  it("does not describe rental performance as collected cash", () => {
    const rental = REPORT_HUB_CARDS.find(
      (card) => card.title === "Rental Performance",
    );
    expect(rental?.description).toMatch(/booking/i);
  });
});
