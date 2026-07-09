import { describe, expect, it } from "vitest";

import { GetInventoryReportService } from "@/modules/reporting/application/services/get-inventory-report.service";
import { GetProcurementReportService } from "@/modules/reporting/application/services/get-procurement-report.service";
import { GetRentalReportService } from "@/modules/reporting/application/services/get-rental-report.service";
import { GetReturnReportService } from "@/modules/reporting/application/services/get-return-report.service";

import {
  buildStandardReportingDataset,
} from "./helpers/reporting.fixtures";
import { InMemoryReportingRepository } from "./helpers/in-memory-reporting.repository";

function seed() {
  const repository = new InMemoryReportingRepository();
  repository.seed(buildStandardReportingDataset());
  return repository;
}

describe("reporting date filter tests", () => {
  it("includes rentals on or after dateFrom", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({ dateFrom: "2026-07-01" });
    expect(result.lines.map((line) => line.orderNumber)).toEqual(["RO-003"]);
  });

  it("includes rentals on or before dateTo", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({ dateTo: "2026-05-31" });
    expect(result.lines.map((line) => line.orderNumber)).toContain("RO-002");
  });

  it("includes rentals within inclusive date range", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({
      dateFrom: "2026-05-01",
      dateTo: "2026-06-30",
    });
    expect(result.totalOrders).toBe(2);
  });

  it("returns empty rentals for future date range", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({
      dateFrom: "2027-01-01",
      dateTo: "2027-01-31",
    });
    expect(result.totalOrders).toBe(0);
  });

  it("filters inventory by createdAt date range", async () => {
    const service = new GetInventoryReportService(seed());
    const result = await service.execute({
      dateFrom: "2026-03-01",
      dateTo: "2026-12-31",
    });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.warehouseCode).toBe("WH-002");
  });

  it("filters returns by inspection date", async () => {
    const service = new GetReturnReportService(seed());
    const result = await service.execute({
      dateFrom: "2026-05-24",
      dateTo: "2026-05-24",
    });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.returnNumber).toBe("RET-002");
  });

  it("filters procurement by order date", async () => {
    const service = new GetProcurementReportService(seed());
    const result = await service.execute({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.poNumber).toBe("PO-003");
  });

  it("accepts string dates through service execute", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    expect(result.totalOrders).toBe(1);
    expect(result.lines[0]!.orderNumber).toBe("RO-001");
  });
});
