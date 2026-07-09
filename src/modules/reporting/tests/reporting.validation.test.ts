import { describe, expect, it } from "vitest";

import {
  CustomerReportQuerySchema,
  DashboardQuerySchema,
  DispatchReportQuerySchema,
  InventoryReportQuerySchema,
  MaintenanceReportQuerySchema,
  ProcurementReportQuerySchema,
  ProductReportQuerySchema,
  RentalReportQuerySchema,
  RepairReportQuerySchema,
  ReturnReportQuerySchema,
  SupplierReportQuerySchema,
  WarehouseReportQuerySchema,
} from "@/modules/reporting/application/schemas/reporting.schemas";

import {
  CUSTOMER_ONE_ID,
  SUPPLIER_ONE_ID,
  WAREHOUSE_ONE_ID,
} from "./helpers/reporting.fixtures";

describe("DashboardQuerySchema", () => {
  it("accepts empty query", () => {
    expect(DashboardQuerySchema.parse({})).toEqual({});
  });

  it("coerces date strings", () => {
    const result = DashboardQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result.dateFrom).toBeInstanceOf(Date);
    expect(result.dateTo).toBeInstanceOf(Date);
  });

  it("rejects dateFrom after dateTo", () => {
    expect(() =>
      DashboardQuerySchema.parse({
        dateFrom: "2026-02-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});

describe("InventoryReportQuerySchema", () => {
  it("accepts empty query with pagination defaults", () => {
    const result = InventoryReportQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortOrder).toBe("asc");
  });

  it("coerces date strings", () => {
    const result = InventoryReportQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result.dateFrom).toBeInstanceOf(Date);
  });

  it("rejects inverted date range", () => {
    expect(() =>
      InventoryReportQuerySchema.parse({
        dateFrom: "2026-03-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });

  it("accepts warehouseId uuid", () => {
    const result = InventoryReportQuerySchema.parse({
      warehouseId: WAREHOUSE_ONE_ID,
    });
    expect(result.warehouseId).toBe(WAREHOUSE_ONE_ID);
  });

  it("rejects invalid warehouseId", () => {
    expect(() =>
      InventoryReportQuerySchema.parse({ warehouseId: "bad-id" }),
    ).toThrow();
  });

  it("coerces lowStockOnly from string", () => {
    expect(InventoryReportQuerySchema.parse({ lowStockOnly: "true" }).lowStockOnly)
      .toBe(true);
    expect(InventoryReportQuerySchema.parse({ lowStockOnly: "false" }).lowStockOnly)
      .toBe(false);
  });

  it("accepts inventory sort fields", () => {
    const result = InventoryReportQuerySchema.parse({
      sortBy: "inventoryValue",
      sortOrder: "desc",
    });
    expect(result.sortBy).toBe("inventoryValue");
  });

  it("rejects invalid sort field", () => {
    expect(() =>
      InventoryReportQuerySchema.parse({ sortBy: "customerCode" }),
    ).toThrow();
  });

  it("rejects search over 200 characters", () => {
    expect(() =>
      InventoryReportQuerySchema.parse({ search: "x".repeat(201) }),
    ).toThrow();
  });
});

describe("RentalReportQuerySchema", () => {
  it("accepts customer and warehouse filters", () => {
    const result = RentalReportQuerySchema.parse({
      customerId: CUSTOMER_ONE_ID,
      warehouseId: WAREHOUSE_ONE_ID,
      status: "CONFIRMED",
    });
    expect(result.customerId).toBe(CUSTOMER_ONE_ID);
    expect(result.status).toBe("CONFIRMED");
  });

  it("rejects inverted dates", () => {
    expect(() =>
      RentalReportQuerySchema.parse({
        dateFrom: "2026-03-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });

  it("accepts rental sort fields", () => {
    const result = RentalReportQuerySchema.parse({ sortBy: "grandTotal" });
    expect(result.sortBy).toBe("grandTotal");
  });
});

describe("DispatchReportQuerySchema", () => {
  it("applies pagination defaults", () => {
    const result = DispatchReportQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    expect(DispatchReportQuerySchema.parse({ status: "READY" }).status).toBe(
      "READY",
    );
  });

  it("rejects search over 200 characters", () => {
    expect(() =>
      DispatchReportQuerySchema.parse({ search: "a".repeat(201) }),
    ).toThrow();
  });
});

describe("ReturnReportQuerySchema", () => {
  it("accepts date range", () => {
    const result = ReturnReportQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result.dateFrom).toBeInstanceOf(Date);
  });

  it("accepts return sort fields", () => {
    expect(
      ReturnReportQuerySchema.parse({ sortBy: "returnNumber" }).sortBy,
    ).toBe("returnNumber");
  });
});

describe("RepairReportQuerySchema", () => {
  it("accepts warehouse filter", () => {
    const result = RepairReportQuerySchema.parse({
      warehouseId: WAREHOUSE_ONE_ID,
    });
    expect(result.warehouseId).toBe(WAREHOUSE_ONE_ID);
  });

  it("rejects inverted dates", () => {
    expect(() =>
      RepairReportQuerySchema.parse({
        dateFrom: "2026-02-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});

describe("MaintenanceReportQuerySchema", () => {
  it("accepts status and warehouse filters", () => {
    const result = MaintenanceReportQuerySchema.parse({
      status: "SCHEDULED",
      warehouseId: WAREHOUSE_ONE_ID,
    });
    expect(result.status).toBe("SCHEDULED");
  });

  it("accepts maintenance sort fields", () => {
    expect(
      MaintenanceReportQuerySchema.parse({ sortBy: "scheduledDate" }).sortBy,
    ).toBe("scheduledDate");
  });
});

describe("ProcurementReportQuerySchema", () => {
  it("accepts supplier and warehouse filters", () => {
    const result = ProcurementReportQuerySchema.parse({
      supplierId: SUPPLIER_ONE_ID,
      warehouseId: WAREHOUSE_ONE_ID,
    });
    expect(result.supplierId).toBe(SUPPLIER_ONE_ID);
  });

  it("rejects invalid supplierId", () => {
    expect(() =>
      ProcurementReportQuerySchema.parse({ supplierId: "not-uuid" }),
    ).toThrow();
  });
});

describe("CustomerReportQuerySchema", () => {
  it("accepts customerId filter", () => {
    const result = CustomerReportQuerySchema.parse({
      customerId: CUSTOMER_ONE_ID,
    });
    expect(result.customerId).toBe(CUSTOMER_ONE_ID);
  });

  it("accepts customer sort fields", () => {
    expect(CustomerReportQuerySchema.parse({ sortBy: "revenue" }).sortBy).toBe(
      "revenue",
    );
  });

  it("coerces page from string", () => {
    expect(CustomerReportQuerySchema.parse({ page: "2" }).page).toBe(2);
  });
});

describe("SupplierReportQuerySchema", () => {
  it("accepts supplierId filter", () => {
    const result = SupplierReportQuerySchema.parse({
      supplierId: SUPPLIER_ONE_ID,
    });
    expect(result.supplierId).toBe(SUPPLIER_ONE_ID);
  });

  it("rejects inverted dates", () => {
    expect(() =>
      SupplierReportQuerySchema.parse({
        dateFrom: "2026-03-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});

describe("WarehouseReportQuerySchema", () => {
  it("accepts warehouseId filter", () => {
    const result = WarehouseReportQuerySchema.parse({
      warehouseId: WAREHOUSE_ONE_ID,
    });
    expect(result.warehouseId).toBe(WAREHOUSE_ONE_ID);
  });

  it("accepts warehouse sort fields", () => {
    expect(
      WarehouseReportQuerySchema.parse({ sortBy: "inventoryValue" }).sortBy,
    ).toBe("inventoryValue");
  });

  it("rejects search over 200 characters", () => {
    expect(() =>
      WarehouseReportQuerySchema.parse({ search: "z".repeat(201) }),
    ).toThrow();
  });
});

describe("ProductReportQuerySchema", () => {
  it("accepts date range", () => {
    const result = ProductReportQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    expect(result.dateFrom).toBeInstanceOf(Date);
  });

  it("accepts product sort fields", () => {
    expect(
      ProductReportQuerySchema.parse({ sortBy: "rentedQuantity" }).sortBy,
    ).toBe("rentedQuantity");
  });

  it("rejects pageSize over 100", () => {
    expect(() => ProductReportQuerySchema.parse({ pageSize: 101 })).toThrow();
  });
});
