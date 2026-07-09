import { describe, expect, it } from "vitest";

import {
  CUSTOMER_REPORT_SORT_FIELDS,
  DISPATCH_REPORT_SORT_FIELDS,
  INVENTORY_REPORT_SORT_FIELDS,
  LOW_STOCK_DEFAULT_THRESHOLD,
  MAINTENANCE_REPORT_SORT_FIELDS,
  PROCUREMENT_REPORT_SORT_FIELDS,
  PRODUCT_REPORT_SORT_FIELDS,
  RENTAL_REPORT_SORT_FIELDS,
  REPAIR_REPORT_SORT_FIELDS,
  REPORTING_MODULE,
  REPORT_SORT_ORDERS,
  RETURN_REPORT_SORT_FIELDS,
  SUPPLIER_REPORT_SORT_FIELDS,
  WAREHOUSE_REPORT_SORT_FIELDS,
} from "./reporting.constants";
import {
  InvalidReportDateRangeError,
  ReportingDomainError,
} from "./reporting.errors";
import {
  average,
  calculateAvailableQuantity,
  calculateInventoryValue,
  calculateRentalDurationDays,
  endOfMonth,
  inDateRange,
  isLowStock,
  isOverstock,
  roundMoney,
  startOfMonth,
  totalPages,
} from "./reporting.rules";

describe("reporting constants", () => {
  it("exposes module name", () => {
    expect(REPORTING_MODULE).toBe("reports");
  });

  it("defines sort orders", () => {
    expect(REPORT_SORT_ORDERS).toEqual(["asc", "desc"]);
  });

  it("defines inventory sort fields", () => {
    expect(INVENTORY_REPORT_SORT_FIELDS).toContain("productCode");
    expect(INVENTORY_REPORT_SORT_FIELDS).toContain("inventoryValue");
  });

  it("defines rental sort fields", () => {
    expect(RENTAL_REPORT_SORT_FIELDS).toContain("orderNumber");
    expect(RENTAL_REPORT_SORT_FIELDS).toContain("grandTotal");
  });

  it("defines dispatch sort fields", () => {
    expect(DISPATCH_REPORT_SORT_FIELDS).toContain("dispatchDate");
  });

  it("defines return sort fields", () => {
    expect(RETURN_REPORT_SORT_FIELDS).toContain("inspectionDate");
  });

  it("defines repair sort fields", () => {
    expect(REPAIR_REPORT_SORT_FIELDS).toContain("repairNumber");
  });

  it("defines maintenance sort fields", () => {
    expect(MAINTENANCE_REPORT_SORT_FIELDS).toContain("scheduledDate");
  });

  it("defines procurement sort fields", () => {
    expect(PROCUREMENT_REPORT_SORT_FIELDS).toContain("poNumber");
  });

  it("defines customer sort fields", () => {
    expect(CUSTOMER_REPORT_SORT_FIELDS).toContain("revenue");
  });

  it("defines supplier sort fields", () => {
    expect(SUPPLIER_REPORT_SORT_FIELDS).toContain("purchaseTotal");
  });

  it("defines warehouse sort fields", () => {
    expect(WAREHOUSE_REPORT_SORT_FIELDS).toContain("inventoryQuantity");
  });

  it("defines product sort fields", () => {
    expect(PRODUCT_REPORT_SORT_FIELDS).toContain("rentalCount");
  });

  it("uses zero as default low stock threshold", () => {
    expect(LOW_STOCK_DEFAULT_THRESHOLD).toBe(0);
  });
});

describe("reporting errors", () => {
  it("creates domain error", () => {
    const error = new ReportingDomainError("boom");
    expect(error.message).toBe("boom");
    expect(error.name).toBe("ReportingDomainError");
  });

  it("creates invalid date range error", () => {
    const error = new InvalidReportDateRangeError();
    expect(error).toBeInstanceOf(ReportingDomainError);
    expect(error.message).toBe("dateFrom must be on or before dateTo");
  });
});

describe("roundMoney", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1);
  });

  it("preserves whole numbers", () => {
    expect(roundMoney(100)).toBe(100);
  });
});

describe("calculateAvailableQuantity", () => {
  it("subtracts reserved from on hand", () => {
    expect(calculateAvailableQuantity(50, 10)).toBe(40);
  });

  it("never returns negative", () => {
    expect(calculateAvailableQuantity(5, 10)).toBe(0);
  });
});

describe("calculateInventoryValue", () => {
  it("multiplies quantity by cost and rounds", () => {
    expect(calculateInventoryValue(10, 25.5)).toBe(255);
  });
});

describe("isLowStock", () => {
  it("returns true when at minimum", () => {
    expect(isLowStock(5, 5)).toBe(true);
  });

  it("returns true when below minimum", () => {
    expect(isLowStock(3, 5)).toBe(true);
  });

  it("returns false when above minimum", () => {
    expect(isLowStock(10, 5)).toBe(false);
  });
});

describe("isOverstock", () => {
  it("returns false when maximum is null", () => {
    expect(isOverstock(100, null)).toBe(false);
  });

  it("returns false when maximum is undefined", () => {
    expect(isOverstock(100, undefined)).toBe(false);
  });

  it("returns true when above maximum", () => {
    expect(isOverstock(101, 100)).toBe(true);
  });

  it("returns false when at maximum", () => {
    expect(isOverstock(100, 100)).toBe(false);
  });
});

describe("calculateRentalDurationDays", () => {
  it("computes inclusive day span", () => {
    const start = new Date("2026-06-10T00:00:00.000Z");
    const end = new Date("2026-06-12T00:00:00.000Z");
    expect(calculateRentalDurationDays(start, end)).toBe(2);
  });

  it("returns zero for inverted dates", () => {
    const start = new Date("2026-06-12T00:00:00.000Z");
    const end = new Date("2026-06-10T00:00:00.000Z");
    expect(calculateRentalDurationDays(start, end)).toBe(0);
  });

  it("returns minimum of one day for same-day events", () => {
    const date = new Date("2026-06-10T12:00:00.000Z");
    expect(calculateRentalDurationDays(date, date)).toBe(1);
  });
});

describe("average", () => {
  it("returns zero for empty array", () => {
    expect(average([])).toBe(0);
  });

  it("computes mean and rounds", () => {
    expect(average([1, 2, 3])).toBe(2);
    expect(average([1, 2])).toBe(1.5);
  });
});

describe("totalPages", () => {
  it("returns zero for empty total", () => {
    expect(totalPages(0, 20)).toBe(0);
  });

  it("computes ceiling division", () => {
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(20, 20)).toBe(1);
  });
});

describe("startOfMonth and endOfMonth", () => {
  it("returns UTC month boundaries", () => {
    const reference = new Date("2026-07-15T12:00:00.000Z");
    const start = startOfMonth(reference);
    const end = endOfMonth(reference);

    expect(start.getUTCFullYear()).toBe(2026);
    expect(start.getUTCMonth()).toBe(6);
    expect(start.getUTCDate()).toBe(1);

    expect(end.getUTCMonth()).toBe(6);
    expect(end.getUTCDate()).toBe(31);
  });
});

describe("inDateRange", () => {
  const date = new Date("2026-06-15T00:00:00.000Z");

  it("returns true when no bounds", () => {
    expect(inDateRange(date)).toBe(true);
  });

  it("excludes dates before dateFrom", () => {
    expect(
      inDateRange(date, new Date("2026-06-16T00:00:00.000Z")),
    ).toBe(false);
  });

  it("excludes dates after dateTo", () => {
    expect(
      inDateRange(date, undefined, new Date("2026-06-14T00:00:00.000Z")),
    ).toBe(false);
  });

  it("includes dates within inclusive range", () => {
    expect(
      inDateRange(
        date,
        new Date("2026-06-01T00:00:00.000Z"),
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
