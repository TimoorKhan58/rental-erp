import { describe, expect, it } from "vitest";

import { GetCustomerReportService } from "@/modules/reporting/application/services/get-customer-report.service";
import { GetDashboardService } from "@/modules/reporting/application/services/get-dashboard.service";
import { GetDispatchReportService } from "@/modules/reporting/application/services/get-dispatch-report.service";
import { GetInventoryReportService } from "@/modules/reporting/application/services/get-inventory-report.service";
import { GetMaintenanceReportService } from "@/modules/reporting/application/services/get-maintenance-report.service";
import { GetProcurementReportService } from "@/modules/reporting/application/services/get-procurement-report.service";
import { GetProductReportService } from "@/modules/reporting/application/services/get-product-report.service";
import { GetRentalReportService } from "@/modules/reporting/application/services/get-rental-report.service";
import { GetRepairReportService } from "@/modules/reporting/application/services/get-repair-report.service";
import { GetReturnReportService } from "@/modules/reporting/application/services/get-return-report.service";
import { GetSupplierReportService } from "@/modules/reporting/application/services/get-supplier-report.service";
import { GetWarehouseReportService } from "@/modules/reporting/application/services/get-warehouse-report.service";
import { ValidationError } from "@/shared/infrastructure/errors";

import {
  CUSTOMER_ONE_ID,
  SUPPLIER_ONE_ID,
  WAREHOUSE_TWO_ID,
  buildStandardReportingDataset,
} from "../tests/helpers/reporting.fixtures";
import { InMemoryReportingRepository } from "../tests/helpers/in-memory-reporting.repository";

function seedRepository() {
  const repository = new InMemoryReportingRepository();
  repository.seed(buildStandardReportingDataset());
  return repository;
}

describe("GetDashboardService", () => {
  it("returns all dashboard summary fields", async () => {
    const service = new GetDashboardService(seedRepository());
    const result = await service.execute({});

    expect(result.totalCustomers).toBe(2);
    expect(result.totalSuppliers).toBe(2);
    expect(result.totalProducts).toBe(3);
    expect(result.totalWarehouses).toBe(2);
    expect(result.inventoryQuantity).toBe(173);
    expect(result.reservedQuantity).toBe(30);
    expect(result.availableQuantity).toBe(143);
    expect(result.inventoryValue).toBe(4550);
    expect(result.rentalOrders).toBe(4);
    expect(result.confirmedOrders).toBe(1);
    expect(result.reservedOrders).toBe(1);
    expect(result.completedRentals).toBe(1);
    expect(result.dispatchesReady).toBe(1);
    expect(result.dispatchesInProgress).toBe(1);
    expect(result.pendingReturns).toBe(1);
    expect(result.repairsPending).toBe(1);
    expect(result.repairsInProgress).toBe(1);
    expect(result.maintenanceScheduled).toBe(1);
    expect(result.maintenanceInProgress).toBe(1);
    expect(result.openPurchaseOrders).toBe(2);
    expect(result.completedPurchaseOrders).toBe(1);
    expect(result.outstandingInvoices).toBe(2);
    expect(result.paidInvoices).toBe(1);
    expect(result.revenueThisMonth).toBe(1300);
    expect(result.paymentsThisMonth).toBe(250);
    expect(result.averageRentalDuration).toBeGreaterThan(0);
  });

  it("accepts string date inputs", async () => {
    const service = new GetDashboardService(seedRepository());
    const result = await service.execute({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    expect(result.totalCustomers).toBe(2);
  });

  it("rejects inverted dates", async () => {
    const service = new GetDashboardService(seedRepository());
    await expect(
      service.execute({
        dateFrom: "2026-03-01",
        dateTo: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("GetInventoryReportService", () => {
  it("returns inventory aggregates", async () => {
    const service = new GetInventoryReportService(seedRepository());
    const result = await service.execute({});

    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.totalQuantity).toBe(173);
    expect(result.lowStockCount).toBe(1);
    expect(result.overstockCount).toBe(1);
  });

  it("filters by warehouse", async () => {
    const service = new GetInventoryReportService(seedRepository());
    const result = await service.execute({ warehouseId: WAREHOUSE_TWO_ID });
    expect(result.lines.every((line) => line.warehouseId === WAREHOUSE_TWO_ID))
      .toBe(true);
  });

  it("paginates inventory lines", async () => {
    const service = new GetInventoryReportService(seedRepository());
    const result = await service.execute({ page: 1, pageSize: 1 });
    expect(result.lines).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(3);
  });
});

describe("GetRentalReportService", () => {
  it("returns rental aggregates", async () => {
    const service = new GetRentalReportService(seedRepository());
    const result = await service.execute({});

    expect(result.totalOrders).toBe(4);
    expect(result.totalRevenue).toBe(1500);
    expect(result.statusCounts.length).toBeGreaterThan(0);
  });

  it("filters by customer", async () => {
    const service = new GetRentalReportService(seedRepository());
    const result = await service.execute({ customerId: CUSTOMER_ONE_ID });
    expect(result.lines.every((line) => line.customerId === CUSTOMER_ONE_ID))
      .toBe(true);
  });

  it("serializes booking dates to ISO strings", async () => {
    const service = new GetRentalReportService(seedRepository());
    const result = await service.execute({ page: 1, pageSize: 1 });
    expect(result.lines[0]!.bookingDate).toContain("T");
  });
});

describe("GetDispatchReportService", () => {
  it("returns dispatch aggregates", async () => {
    const service = new GetDispatchReportService(seedRepository());
    const result = await service.execute({});

    expect(result.total).toBe(3);
    expect(result.pendingCount).toBe(2);
    expect(result.completedCount).toBe(1);
  });
});

describe("GetReturnReportService", () => {
  it("returns return aggregates", async () => {
    const service = new GetReturnReportService(seedRepository());
    const result = await service.execute({});

    expect(result.total).toBe(2);
    expect(result.outstandingCount).toBe(1);
    expect(result.completedCount).toBe(1);
    expect(result.totalDamaged).toBe(1);
    expect(result.totalLost).toBe(1);
  });
});

describe("GetRepairReportService", () => {
  it("returns repair aggregates", async () => {
    const service = new GetRepairReportService(seedRepository());
    const result = await service.execute({});

    expect(result.total).toBe(3);
    expect(result.statusCounts.length).toBeGreaterThan(0);
    expect(result.averageTurnaroundDays).toBeGreaterThan(0);
  });
});

describe("GetMaintenanceReportService", () => {
  it("returns maintenance aggregates", async () => {
    const service = new GetMaintenanceReportService(seedRepository());
    const result = await service.execute({});

    expect(result.total).toBe(3);
    expect(result.upcomingCount).toBe(1);
    expect(result.completedCount).toBe(1);
  });
});

describe("GetProcurementReportService", () => {
  it("returns procurement aggregates", async () => {
    const service = new GetProcurementReportService(seedRepository());
    const result = await service.execute({});

    expect(result.totalPurchaseOrders).toBe(3);
    expect(result.totalPurchaseValue).toBe(600);
    expect(result.supplierTotals.length).toBe(2);
  });

  it("filters by supplier", async () => {
    const service = new GetProcurementReportService(seedRepository());
    const result = await service.execute({ supplierId: SUPPLIER_ONE_ID });
    expect(result.lines.every((line) => line.supplierId === SUPPLIER_ONE_ID))
      .toBe(true);
  });
});

describe("GetCustomerReportService", () => {
  it("returns customer aggregates", async () => {
    const service = new GetCustomerReportService(seedRepository());
    const result = await service.execute({});

    expect(result.totalCustomers).toBe(2);
    expect(result.totalRevenue).toBe(1500);
  });

  it("filters by customerId", async () => {
    const service = new GetCustomerReportService(seedRepository());
    const result = await service.execute({ customerId: CUSTOMER_ONE_ID });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.customerCode).toBe("CUST-001");
  });
});

describe("GetSupplierReportService", () => {
  it("returns supplier aggregates", async () => {
    const service = new GetSupplierReportService(seedRepository());
    const result = await service.execute({});

    expect(result.totalSuppliers).toBe(2);
    expect(result.totalPurchaseValue).toBe(600);
  });
});

describe("GetWarehouseReportService", () => {
  it("returns warehouse aggregates", async () => {
    const service = new GetWarehouseReportService(seedRepository());
    const result = await service.execute({});

    expect(result.totalWarehouses).toBe(2);
    expect(result.totalInventoryValue).toBe(4550);
  });
});

describe("GetProductReportService", () => {
  it("returns product aggregates with most and least rented", async () => {
    const service = new GetProductReportService(seedRepository());
    const result = await service.execute({});

    expect(result.total).toBe(3);
    expect(result.mostRented.length).toBeGreaterThan(0);
    expect(result.leastRented.length).toBeGreaterThan(0);
    expect(result.mostRented[0]!.rentalCount).toBeGreaterThanOrEqual(
      result.leastRented[0]!.rentalCount,
    );
  });

  it("filters by date range on booking dates", async () => {
    const service = new GetProductReportService(seedRepository());
    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });
    const productOne = result.lines.find((line) => line.productCode === "PROD-001");
    expect(productOne?.rentalCount).toBe(1);
  });
});
