import { describe, expect, it } from "vitest";

import {
  CUSTOMER_ONE_ID,
  WAREHOUSE_ONE_ID,
  WAREHOUSE_TWO_ID,
  buildStandardReportingDataset,
} from "./helpers/reporting.fixtures";
import { InMemoryReportingRepository } from "./helpers/in-memory-reporting.repository";

function createRepo() {
  const repository = new InMemoryReportingRepository();
  repository.seed(buildStandardReportingDataset());
  return repository;
}

describe("InMemoryReportingRepository", () => {
  it("returns dashboard summary with all fields", async () => {
    const report = await createRepo().getDashboard({});
    expect(report.totalCustomers).toBe(2);
    expect(report.inventoryValue).toBe(4550);
    expect(report.revenueThisMonth).toBe(1300);
    expect(report.paymentsThisMonth).toBe(250);
  });

  it("computes inventory report totals", async () => {
    const report = await createRepo().getInventoryReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.totalQuantity).toBe(173);
    expect(report.lowStockCount).toBe(1);
    expect(report.overstockCount).toBe(1);
  });

  it("filters inventory by warehouse", async () => {
    const report = await createRepo().getInventoryReport({
      page: 1,
      pageSize: 20,
      warehouseId: WAREHOUSE_TWO_ID,
    });
    expect(report.lines).toHaveLength(1);
    expect(report.lines[0]!.warehouseCode).toBe("WH-002");
  });

  it("filters low stock only", async () => {
    const report = await createRepo().getInventoryReport({
      page: 1,
      pageSize: 20,
      lowStockOnly: true,
    });
    expect(report.lines.every((line) => line.isLowStock)).toBe(true);
    expect(report.lines).toHaveLength(1);
  });

  it("searches inventory by product code", async () => {
    const report = await createRepo().getInventoryReport({
      page: 1,
      pageSize: 20,
      search: "PROD-002",
    });
    expect(report.lines).toHaveLength(1);
    expect(report.lines[0]!.productCode).toBe("PROD-002");
  });

  it("sorts inventory by quantity descending", async () => {
    const report = await createRepo().getInventoryReport({
      page: 1,
      pageSize: 20,
      sortBy: "quantityOnHand",
      sortOrder: "desc",
    });
    expect(report.lines[0]!.quantityOnHand).toBe(120);
  });

  it("paginates inventory report", async () => {
    const report = await createRepo().getInventoryReport({
      page: 2,
      pageSize: 1,
      sortBy: "productCode",
      sortOrder: "asc",
    });
    expect(report.lines).toHaveLength(1);
    expect(report.totalPages).toBe(3);
  });

  it("returns rental report with status counts", async () => {
    const report = await createRepo().getRentalReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.totalOrders).toBe(4);
    expect(report.statusCounts.some((row) => row.status === "CONFIRMED")).toBe(
      true,
    );
  });

  it("filters rentals by status", async () => {
    const report = await createRepo().getRentalReport({
      page: 1,
      pageSize: 20,
      status: "COMPLETED",
    });
    expect(report.lines.every((line) => line.status === "COMPLETED")).toBe(true);
  });

  it("returns dispatch turnaround for completed dispatches", async () => {
    const report = await createRepo().getDispatchReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.completedCount).toBe(1);
    expect(report.averageTurnaroundHours).toBeGreaterThan(0);
  });

  it("aggregates return damage totals", async () => {
    const report = await createRepo().getReturnReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.totalDamaged).toBe(1);
    expect(report.totalLost).toBe(1);
  });

  it("returns repair status counts", async () => {
    const report = await createRepo().getRepairReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.statusCounts.length).toBeGreaterThan(0);
  });

  it("returns maintenance upcoming and completed counts", async () => {
    const report = await createRepo().getMaintenanceReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.upcomingCount).toBe(1);
    expect(report.completedCount).toBe(1);
  });

  it("returns procurement supplier totals sorted by value", async () => {
    const report = await createRepo().getProcurementReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.supplierTotals[0]!.purchaseTotal).toBeGreaterThanOrEqual(
      report.supplierTotals[report.supplierTotals.length - 1]!.purchaseTotal,
    );
  });

  it("returns customer report with outstanding balance", async () => {
    const report = await createRepo().getCustomerReport({
      page: 1,
      pageSize: 20,
    });
    const customer = report.lines.find(
      (line) => line.customerId === CUSTOMER_ONE_ID,
    );
    expect(customer?.outstandingBalance).toBe(650);
  });

  it("returns supplier purchase totals", async () => {
    const report = await createRepo().getSupplierReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.totalPurchaseValue).toBe(600);
  });

  it("returns warehouse utilization", async () => {
    const report = await createRepo().getWarehouseReport({
      page: 1,
      pageSize: 20,
    });
    const main = report.lines.find(
      (line) => line.warehouseId === WAREHOUSE_ONE_ID,
    );
    expect(main?.utilizationPercent).toBeGreaterThan(0);
  });

  it("returns product most and least rented", async () => {
    const report = await createRepo().getProductReport({
      page: 1,
      pageSize: 20,
    });
    expect(report.mostRented.length).toBeGreaterThan(0);
    expect(report.leastRented.length).toBeGreaterThan(0);
  });

  it("clears seeded data", async () => {
    const repository = createRepo();
    repository.clear();
    const report = await repository.getDashboard({});
    expect(report.totalCustomers).toBe(0);
    expect(report.rentalOrders).toBe(0);
  });

  it("re-seeds data replacing previous state", async () => {
    const repository = createRepo();
    repository.clear();
    repository.seed(buildStandardReportingDataset());
    const report = await repository.getDashboard({});
    expect(report.totalCustomers).toBe(2);
  });
});
