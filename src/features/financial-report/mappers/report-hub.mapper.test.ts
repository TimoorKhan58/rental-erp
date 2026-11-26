import { describe, expect, it } from "vitest";

import { REPORT_GROUPS, REPORT_HUB_CARDS } from "./report-hub.mapper";

describe("REPORT_HUB_CARDS", () => {
  it("puts every report in a known group", () => {
    const groups = new Set<string>(REPORT_GROUPS.map((group) => group.id));
    for (const card of REPORT_HUB_CARDS) {
      expect(groups.has(card.group)).toBe(true);
    }
  });

  it("keeps the money reports financial and describes them in plain words", () => {
    const money = REPORT_HUB_CARDS.filter((card) => card.group === "money");
    expect(money.map((card) => card.title)).toEqual([
      "Profit & Loss",
      "Cash Flow",
      "Balance Sheet",
      "Revenue",
      "Expenses",
    ]);
    expect(money.every((card) => card.category === "financial")).toBe(true);
    expect(money.some((card) => /journal/i.test(card.description))).toBe(false);
  });

  it("does not describe rental performance as collected cash", () => {
    const rental = REPORT_HUB_CARDS.find((card) => card.title === "Rental Performance");
    expect(rental?.description).toMatch(/booking/i);
    expect(rental?.description).toMatch(/not yet collected/i);
  });
});
