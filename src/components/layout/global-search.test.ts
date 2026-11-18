import { describe, expect, it } from "vitest";

import { matchPages } from "./global-search-input";

const groups = [
  { items: [{ label: "Payments", href: "/payments" }, { label: "Rental Orders", href: "/rental-orders" }] },
  { items: [{ label: "Purchases", href: "/procurements" }] },
];

describe("header search: menu pages (usability revamp R5)", () => {
  it("finds pages by part of their name", () => {
    expect(matchPages("pay", groups).map((hit) => hit.href)).toEqual(["/payments"]);
    expect(matchPages("ORDER", groups).map((hit) => hit.title)).toEqual(["Rental Orders"]);
  });

  it("waits for at least two letters", () => {
    expect(matchPages("p", groups)).toEqual([]);
  });
});
