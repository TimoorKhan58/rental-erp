import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GetAnalyticsOverviewService } from "@/modules/reporting/application/services/get-analytics-overview.service";
import { ValidationError } from "@/shared/infrastructure/errors";

import {
  buildCustomer,
  buildInventory,
  buildInvoice,
  buildPayment,
  buildPurchaseOrder,
  buildRentalOrder,
  buildStandardReportingDataset,
  CUSTOMER_TWO_ID,
  RENTAL_ONE_ID,
} from "../tests/helpers/reporting.fixtures";
import { InMemoryReportingRepository } from "../tests/helpers/in-memory-reporting.repository";

const ANALYTICS_NOW = new Date("2026-07-15T12:00:00.000Z");

function seedRepository() {
  const repository = new InMemoryReportingRepository();
  repository.seed(buildStandardReportingDataset());
  return repository;
}

function createFinancialStub(totalRevenue = 0) {
  return {
    getRevenueSummary: vi.fn().mockResolvedValue({
      dateFrom: null,
      dateTo: null,
      lines: [],
      totalRevenue,
    }),
  };
}

describe("GetAnalyticsOverviewService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(ANALYTICS_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns frozen qualified money fields and rental counts", async () => {
    const reporting = seedRepository();
    const financial = createFinancialStub(999);
    const service = new GetAnalyticsOverviewService(
      reporting,
      financial as never,
    );

    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(result.bookedRentalValue).toBeGreaterThanOrEqual(0);
    expect(result.billedRevenue).toBeGreaterThanOrEqual(0);
    expect(result.collectedCash).toBeGreaterThanOrEqual(0);
    expect(result.recognizedRevenue).toBe(999);
    expect(result.rentals.activeCount).toBeGreaterThanOrEqual(0);
    expect(result.financial.outstandingAR).toBeGreaterThanOrEqual(0);
    expect(result).not.toHaveProperty("revenue");
    expect(result).not.toHaveProperty("paidInvoiceAmount");
    expect(result).not.toHaveProperty("rentedInventoryQuantity");
    expect(result.inventory).not.toHaveProperty("rentedQuantity");
    expect(financial.getRevenueSummary).toHaveBeenCalled();
  });

  it("excludes DRAFT and CANCELLED from booked rental value", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      rentals: [
        buildRentalOrder({
          id: RENTAL_ONE_ID,
          status: "CONFIRMED",
          bookingDate: new Date("2026-07-10T00:00:00.000Z"),
          grandTotal: 100,
        }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9",
          orderNumber: "RO-DRAFT",
          status: "DRAFT",
          bookingDate: new Date("2026-07-10T00:00:00.000Z"),
          grandTotal: 500,
        }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8",
          orderNumber: "RO-CANCEL",
          status: "CANCELLED",
          bookingDate: new Date("2026-07-10T00:00:00.000Z"),
          grandTotal: 700,
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(result.bookedRentalValue).toBe(100);
  });

  it("counts active rentals as CONFIRMED + RESERVED only", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      rentals: [
        buildRentalOrder({ status: "CONFIRMED", grandTotal: 10 }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7",
          orderNumber: "RO-RES",
          status: "RESERVED",
          grandTotal: 10,
        }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6",
          orderNumber: "RO-DONE",
          status: "COMPLETED",
          grandTotal: 10,
        }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5",
          orderNumber: "RO-DRAFT",
          status: "DRAFT",
          grandTotal: 10,
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({});

    expect(result.rentals.activeCount).toBe(2);
  });

  it("counts upcoming rentals within 14-day UTC horizon", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      rentals: [
        buildRentalOrder({
          status: "CONFIRMED",
          eventStartDate: new Date("2026-07-20T00:00:00.000Z"),
          grandTotal: 10,
        }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
          orderNumber: "RO-FAR",
          status: "CONFIRMED",
          eventStartDate: new Date("2026-08-20T00:00:00.000Z"),
          grandTotal: 10,
        }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
          orderNumber: "RO-DRAFT-UP",
          status: "DRAFT",
          eventStartDate: new Date("2026-07-20T00:00:00.000Z"),
          grandTotal: 10,
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({});

    expect(result.rentals.upcomingCount).toBe(1);
  });

  it("counts overdue rentals by expectedReturnDate and status", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      rentals: [
        buildRentalOrder({
          status: "RESERVED",
          expectedReturnDate: new Date("2026-07-01T00:00:00.000Z"),
          grandTotal: 10,
        }),
        buildRentalOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
          orderNumber: "RO-DONE-OD",
          status: "COMPLETED",
          expectedReturnDate: new Date("2026-07-01T00:00:00.000Z"),
          grandTotal: 10,
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({});

    expect(result.rentals.overdueCount).toBe(1);
  });

  it("includes ISSUED, PARTIALLY_PAID, and PAID invoices in billedRevenue", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      invoices: [
        buildInvoice({
          status: "ISSUED",
          grandTotal: 100,
          invoiceDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
        buildInvoice({
          id: "60606060-6060-4606-8606-606060606061",
          status: "PARTIALLY_PAID",
          grandTotal: 40,
          invoiceDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
        buildInvoice({
          id: "60606060-6060-4606-8606-606060606062",
          status: "PAID",
          grandTotal: 25,
          balance: 0,
          invoiceDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
        buildInvoice({
          id: "60606060-6060-4606-8606-606060606063",
          status: "DRAFT",
          grandTotal: 999,
          invoiceDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
        buildInvoice({
          id: "60606060-6060-4606-8606-606060606064",
          status: "VOID",
          grandTotal: 888,
          invoiceDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(result.billedRevenue).toBe(165);
  });

  it("includes only POSTED payments in collectedCash", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      payments: [
        buildPayment({
          status: "POSTED",
          amount: 50,
          paymentDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
        buildPayment({
          id: "70707070-7070-4707-8707-707070707071",
          status: "PENDING",
          amount: 80,
          paymentDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
        buildPayment({
          id: "70707070-7070-4707-8707-707070707072",
          status: "VOID",
          amount: 90,
          paymentDate: new Date("2026-07-10T00:00:00.000Z"),
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(result.collectedCash).toBe(50);
  });

  it("counts new active customers by createdAt in period", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      customers: [
        buildCustomer({
          createdAt: new Date("2026-07-05T00:00:00.000Z"),
          isActive: true,
        }),
        buildCustomer({
          id: CUSTOMER_TWO_ID,
          customerCode: "CUST-002",
          createdAt: new Date("2026-07-05T00:00:00.000Z"),
          isActive: false,
        }),
        buildCustomer({
          id: "11111111-1111-4111-8111-111111111119",
          customerCode: "CUST-OLD",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          isActive: true,
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(result.customers.newCount).toBe(1);
  });

  it("excludes DRAFT and CANCELLED from ordered procurement value", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      purchaseOrders: [
        buildPurchaseOrder({
          status: "APPROVED",
          orderDate: new Date("2026-07-10T00:00:00.000Z"),
          items: [{ quantity: 2, unitCost: 10 }],
        }),
        buildPurchaseOrder({
          id: "40404040-4040-4404-8404-404040404041",
          poNumber: "PO-DRAFT",
          status: "DRAFT",
          orderDate: new Date("2026-07-10T00:00:00.000Z"),
          items: [{ quantity: 9, unitCost: 10 }],
        }),
        buildPurchaseOrder({
          id: "40404040-4040-4404-8404-404040404042",
          poNumber: "PO-CANCEL",
          status: "CANCELLED",
          orderDate: new Date("2026-07-10T00:00:00.000Z"),
          items: [{ quantity: 8, unitCost: 10 }],
        }),
      ],
    });

    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(result.procurement.orderedProcurementValue).toBe(20);
  });

  it("returns zeros for empty datasets", async () => {
    const reporting = new InMemoryReportingRepository();
    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({});

    expect(result.bookedRentalValue).toBe(0);
    expect(result.billedRevenue).toBe(0);
    expect(result.collectedCash).toBe(0);
    expect(result.rentals.activeCount).toBe(0);
    expect(result.customers.newCount).toBe(0);
    expect(result.procurement.orderedProcurementValue).toBe(0);
    expect(result.inventory.availableQuantity).toBe(0);
  });

  it("rejects inverted dates", async () => {
    const service = new GetAnalyticsOverviewService(
      seedRepository(),
      createFinancialStub() as never,
    );
    await expect(
      service.execute({
        dateFrom: "2026-08-01",
        dateTo: "2026-07-01",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("exposes available and reserved inventory without rented quantity", async () => {
    const reporting = new InMemoryReportingRepository();
    reporting.seed({
      inventories: [
        buildInventory({ quantityOnHand: 50, reservedQuantity: 10 }),
      ],
    });
    const service = new GetAnalyticsOverviewService(
      reporting,
      createFinancialStub() as never,
    );
    const result = await service.execute({});

    expect(result.inventory.availableQuantity).toBe(40);
    expect(result.inventory.reservedQuantity).toBe(10);
  });
});
