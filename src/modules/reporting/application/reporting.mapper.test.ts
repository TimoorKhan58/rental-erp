import { describe, expect, it } from "vitest";

import {
  toCustomerReportDto,
  toCustomerReportQuery,
  toDashboardDto,
  toDashboardQuery,
  toDispatchReportDto,
  toDispatchReportQuery,
  toInventoryReportDto,
  toInventoryReportQuery,
  toMaintenanceReportDto,
  toProcurementReportDto,
  toProcurementReportQuery,
  toProductReportDto,
  toProductReportQuery,
  toRentalReportDto,
  toRentalReportQuery,
  toRepairReportDto,
  toRepairReportQuery,
  toReturnReportDto,
  toSupplierReportDto,
  toWarehouseReportDto,
  toWarehouseReportQuery,
} from "@/modules/reporting/application/mappers/reporting.mapper";

const PAGE_DEFAULTS = {
  page: 1,
  pageSize: 20,
  sortOrder: "asc" as const,
};

import {
  CUSTOMER_ONE_ID,
  SUPPLIER_ONE_ID,
  WAREHOUSE_ONE_ID,
} from "../tests/helpers/reporting.fixtures";

describe("reporting mappers", () => {
  it("maps dashboard query and dto", () => {
    const dateFrom = new Date("2026-01-01");
    const dateTo = new Date("2026-01-31");
    expect(toDashboardQuery({ dateFrom, dateTo })).toEqual({ dateFrom, dateTo });

    const dto = toDashboardDto({
      totalCustomers: 2,
      totalSuppliers: 1,
      totalProducts: 3,
      totalWarehouses: 1,
      inventoryValue: 1000,
      inventoryQuantity: 50,
      reservedQuantity: 5,
      availableQuantity: 45,
      rentalOrders: 10,
      confirmedOrders: 3,
      reservedOrders: 2,
      completedRentals: 4,
      dispatchesReady: 1,
      dispatchesInProgress: 2,
      pendingReturns: 1,
      repairsPending: 1,
      repairsInProgress: 0,
      maintenanceScheduled: 2,
      maintenanceInProgress: 1,
      openPurchaseOrders: 3,
      completedPurchaseOrders: 5,
      outstandingInvoices: 2,
      paidInvoices: 8,
      revenueThisMonth: 500,
      paymentsThisMonth: 250,
      averageRentalDuration: 3,
    });

    expect(dto.totalCustomers).toBe(2);
    expect(dto.averageRentalDuration).toBe(3);
  });

  it("maps inventory query and dto", () => {
    const query = toInventoryReportQuery({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      warehouseId: WAREHOUSE_ONE_ID,
      lowStockOnly: true,
    });
    expect(query.warehouseId).toBe(WAREHOUSE_ONE_ID);
    expect(query.lowStockOnly).toBe(true);

    const dto = toInventoryReportDto({
      lines: [
        {
          inventoryId: "inv-1",
          productId: "p1",
          productCode: "PROD-001",
          productName: "Chair",
          warehouseId: WAREHOUSE_ONE_ID,
          warehouseCode: "WH-001",
          warehouseName: "Main",
          quantityOnHand: 3,
          reservedQuantity: 0,
          availableQuantity: 3,
          minimumStock: 5,
          maximumStock: 100,
          purchaseCost: 25,
          inventoryValue: 75,
          isLowStock: true,
          isOverstock: false,
          ageDays: 10,
        },
      ],
      totalQuantity: 3,
      totalReserved: 0,
      totalAvailable: 3,
      totalValue: 75,
      lowStockCount: 1,
      overstockCount: 0,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.isLowStock).toBe(true);
  });

  it("maps rental query and dto with ISO dates", () => {
    const bookingDate = new Date("2026-06-01T00:00:00.000Z");
    const dto = toRentalReportDto({
      lines: [
        {
          id: "r1",
          orderNumber: "RO-001",
          customerId: CUSTOMER_ONE_ID,
          customerName: "Acme",
          warehouseId: WAREHOUSE_ONE_ID,
          warehouseName: "Main",
          status: "CONFIRMED",
          bookingDate,
          eventStartDate: new Date("2026-06-10T00:00:00.000Z"),
          eventEndDate: new Date("2026-06-12T00:00:00.000Z"),
          expectedReturnDate: new Date("2026-06-13T00:00:00.000Z"),
          actualReturnDate: null,
          durationDays: 2,
          grandTotal: 500,
        },
      ],
      totalOrders: 1,
      totalRevenue: 500,
      averageDuration: 2,
      statusCounts: [{ status: "CONFIRMED", count: 1 }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.bookingDate).toBe(bookingDate.toISOString());
    expect(dto.lines[0]!.actualReturnDate).toBeNull();
    expect(toRentalReportQuery({ page: 1, pageSize: 20, sortOrder: "asc" }).page)
      .toBe(1);
  });

  it("maps dispatch query and dto", () => {
    const dispatchDate = new Date("2026-06-09T00:00:00.000Z");
    const dto = toDispatchReportDto({
      lines: [
        {
          id: "d1",
          dispatchNumber: "DSP-001",
          rentalOrderId: "ro1",
          orderNumber: "RO-001",
          status: "READY",
          dispatchDate,
          deliveryMethod: "DELIVERY",
          loadedAt: null,
          departedAt: null,
          deliveredAt: null,
          turnaroundHours: null,
        },
      ],
      pendingCount: 1,
      completedCount: 0,
      averageTurnaroundHours: 0,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.dispatchDate).toBe(dispatchDate.toISOString());
    expect(
      toDispatchReportQuery({ ...PAGE_DEFAULTS, status: "READY" }).status,
    ).toBe("READY");
  });

  it("maps return query and dto", () => {
    const inspectionDate = new Date("2026-06-14T00:00:00.000Z");
    const dto = toReturnReportDto({
      lines: [
        {
          id: "ret1",
          returnNumber: "RET-001",
          rentalOrderId: "ro1",
          orderNumber: "RO-001",
          status: "DRAFT",
          inspectionDate,
          receivedAt: null,
          completedAt: null,
          damagedQuantity: 1,
          lostQuantity: 0,
        },
      ],
      outstandingCount: 1,
      completedCount: 0,
      totalDamaged: 1,
      totalLost: 0,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.inspectionDate).toBe(inspectionDate.toISOString());
  });

  it("maps repair query and dto", () => {
    const repairDate = new Date("2026-06-15T00:00:00.000Z");
    const dto = toRepairReportDto({
      lines: [
        {
          id: "rep1",
          repairNumber: "RPR-001",
          productId: "p1",
          productName: "Chair",
          warehouseId: WAREHOUSE_ONE_ID,
          status: "PENDING",
          repairDate,
          startedAt: null,
          completedAt: null,
          turnaroundDays: null,
          estimatedCost: 50,
          actualCost: null,
        },
      ],
      statusCounts: [{ status: "PENDING", count: 1 }],
      averageTurnaroundDays: 0,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.repairDate).toBe(repairDate.toISOString());
    expect(
      toRepairReportQuery({
        ...PAGE_DEFAULTS,
        warehouseId: WAREHOUSE_ONE_ID,
      }).warehouseId,
    ).toBe(WAREHOUSE_ONE_ID);
  });

  it("maps maintenance query and dto", () => {
    const scheduledDate = new Date("2026-07-01T00:00:00.000Z");
    const dto = toMaintenanceReportDto({
      lines: [
        {
          id: "mnt1",
          maintenanceNumber: "MNT-001",
          productId: "p1",
          productName: "Chair",
          warehouseId: WAREHOUSE_ONE_ID,
          status: "SCHEDULED",
          serviceType: "INSPECTION",
          scheduledDate,
          startedAt: null,
          completedAt: null,
          estimatedCost: 75,
          actualCost: null,
        },
      ],
      upcomingCount: 1,
      completedCount: 0,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.scheduledDate).toBe(scheduledDate.toISOString());
  });

  it("maps procurement query and dto", () => {
    const orderDate = new Date("2026-05-01T00:00:00.000Z");
    const dto = toProcurementReportDto({
      lines: [
        {
          id: "po1",
          poNumber: "PO-001",
          supplierId: SUPPLIER_ONE_ID,
          supplierName: "Supply Co",
          warehouseId: WAREHOUSE_ONE_ID,
          warehouseName: "Main",
          status: "APPROVED",
          orderDate,
          expectedDate: null,
          lineCount: 1,
          purchaseTotal: 200,
        },
      ],
      totalPurchaseOrders: 1,
      totalPurchaseValue: 200,
      supplierTotals: [],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.orderDate).toBe(orderDate.toISOString());
    expect(
      toProcurementReportQuery({
        ...PAGE_DEFAULTS,
        supplierId: SUPPLIER_ONE_ID,
      }).supplierId,
    ).toBe(SUPPLIER_ONE_ID);
  });

  it("maps customer query and dto", () => {
    const lastOrderDate = new Date("2026-06-01T00:00:00.000Z");
    const dto = toCustomerReportDto({
      lines: [
        {
          customerId: CUSTOMER_ONE_ID,
          customerCode: "CUST-001",
          customerName: "Acme",
          orderCount: 2,
          completedOrderCount: 1,
          revenue: 500,
          outstandingBalance: 150,
          lastOrderDate,
        },
      ],
      totalCustomers: 1,
      totalRevenue: 500,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.lastOrderDate).toBe(lastOrderDate.toISOString());
    expect(
      toCustomerReportQuery({
        ...PAGE_DEFAULTS,
        customerId: CUSTOMER_ONE_ID,
      }).customerId,
    ).toBe(CUSTOMER_ONE_ID);
  });

  it("maps supplier query and dto", () => {
    const dto = toSupplierReportDto({
      lines: [
        {
          supplierId: SUPPLIER_ONE_ID,
          supplierCode: "SUP-001",
          supplierName: "Supply Co",
          purchaseOrderCount: 1,
          purchaseTotal: 200,
          lastOrderDate: null,
        },
      ],
      totalSuppliers: 1,
      totalPurchaseValue: 200,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.lastOrderDate).toBeNull();
  });

  it("maps warehouse query and dto", () => {
    const dto = toWarehouseReportDto({
      lines: [
        {
          warehouseId: WAREHOUSE_ONE_ID,
          warehouseCode: "WH-001",
          warehouseName: "Main",
          inventoryQuantity: 53,
          reservedQuantity: 10,
          availableQuantity: 43,
          inventoryValue: 1550,
          productCount: 2,
          utilizationPercent: 18.87,
        },
      ],
      totalWarehouses: 1,
      totalInventoryValue: 1550,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.utilizationPercent).toBe(18.87);
    expect(
      toWarehouseReportQuery({
        ...PAGE_DEFAULTS,
        warehouseId: WAREHOUSE_ONE_ID,
      }).warehouseId,
    ).toBe(WAREHOUSE_ONE_ID);
  });

  it("maps product query and dto", () => {
    const dto = toProductReportDto({
      lines: [
        {
          productId: "p1",
          productCode: "PROD-001",
          productName: "Chair",
          rentalCount: 2,
          rentedQuantity: 22,
          revenue: 500,
          quantityOnHand: 170,
          isRentable: true,
        },
      ],
      mostRented: [],
      leastRented: [],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.lines[0]!.rentalCount).toBe(2);
    expect(
      toProductReportQuery({ ...PAGE_DEFAULTS, sortBy: "rentalCount" }).sortBy,
    ).toBe("rentalCount");
  });
});
