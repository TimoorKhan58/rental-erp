import { describe, expect, it } from "vitest";
import { visibleBreadcrumbs } from "./page-header";

describe("visibleBreadcrumbs (UI redesign)", () => {
  it("hides a trail that only says Dashboard › this page", () => {
    expect(
      visibleBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }, { label: "Customers" }]),
    ).toEqual([]);
  });

  it("keeps list › record as a way back, without Dashboard", () => {
    expect(
      visibleBreadcrumbs([
        { label: "Dashboard", href: "/dashboard" },
        { label: "Orders", href: "/rental-orders" },
        { label: "RO-00056" },
      ]),
    ).toEqual([{ label: "Orders", href: "/rental-orders" }, { label: "RO-00056" }]);
  });

  it("handles no breadcrumbs", () => {
    expect(visibleBreadcrumbs(undefined)).toEqual([]);
  });
});
