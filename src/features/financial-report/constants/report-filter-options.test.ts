import { describe, expect, it } from "vitest";

import { DISPATCH_STATUSES } from "@/modules/dispatch/domain/dispatch.constants";
import { PURCHASE_ORDER_STATUSES } from "@/modules/procurement/domain/purchase-order.constants";
import { RENTAL_ORDER_STATUSES } from "@/modules/rental-order/domain/rental-order.constants";

import {
  DISPATCH_REPORT_STATUS_OPTIONS,
  PROCUREMENT_REPORT_STATUS_OPTIONS,
  RENTAL_REPORT_STATUS_OPTIONS,
} from "./report-filter-options";

describe("report filter status options", () => {
  it("uses rental-order domain statuses", () => {
    expect(RENTAL_REPORT_STATUS_OPTIONS).toEqual([...RENTAL_ORDER_STATUSES]);
  });

  it("uses dispatch domain statuses instead of invented delivery aliases", () => {
    expect(DISPATCH_REPORT_STATUS_OPTIONS).toEqual([...DISPATCH_STATUSES]);
    expect(DISPATCH_REPORT_STATUS_OPTIONS).not.toContain("PENDING");
    expect(DISPATCH_REPORT_STATUS_OPTIONS).not.toContain("LOADED");
    expect(DISPATCH_REPORT_STATUS_OPTIONS).not.toContain("IN_TRANSIT");
    expect(DISPATCH_REPORT_STATUS_OPTIONS).not.toContain("DELIVERED");
  });

  it("uses purchase-order domain statuses and does not invent ORDERED", () => {
    expect(PROCUREMENT_REPORT_STATUS_OPTIONS).toEqual([
      ...PURCHASE_ORDER_STATUSES,
    ]);
    expect(PROCUREMENT_REPORT_STATUS_OPTIONS).not.toContain("ORDERED");
  });
});
