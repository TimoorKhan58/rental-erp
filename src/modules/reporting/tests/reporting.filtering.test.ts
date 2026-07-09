import { describe, expect, it } from "vitest";

import { GetInventoryReportService } from "@/modules/reporting/application/services/get-inventory-report.service";
import { GetProcurementReportService } from "@/modules/reporting/application/services/get-procurement-report.service";
import { GetRentalReportService } from "@/modules/reporting/application/services/get-rental-report.service";
import { GetRepairReportService } from "@/modules/reporting/application/services/get-repair-report.service";
import { GetSupplierReportService } from "@/modules/reporting/application/services/get-supplier-report.service";
import { GetWarehouseReportService } from "@/modules/reporting/application/services/get-warehouse-report.service";

import {
  CUSTOMER_TWO_ID,
  SUPPLIER_ONE_ID,
  SUPPLIER_TWO_ID,
  WAREHOUSE_ONE_ID,
  WAREHOUSE_TWO_ID,
  buildStandardReportingDataset,
} from "./helpers/reporting.fixtures";
import { InMemoryReportingRepository } from "./helpers/in-memory-reporting.repository";

function seed() {
  const repository = new InMemoryReportingRepository();
  repository.seed(buildStandardReportingDataset());
  return repository;
}

describe("reporting filter tests", () => {
  it("filters rentals by customerId", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({ customerId: CUSTOMER_TWO_ID });
    expect(result.lines.every((line) => line.customerId === CUSTOMER_TWO_ID))
      .toBe(true);
    expect(result.totalOrders).toBe(1);
  });

  it("filters rentals by warehouseId", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({ warehouseId: WAREHOUSE_ONE_ID });
    expect(result.lines.every((line) => line.warehouseId === WAREHOUSE_ONE_ID))
      .toBe(true);
  });

  it("filters rentals by status", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({ status: "RESERVED" });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.orderNumber).toBe("RO-003");
  });

  it("filters inventory by warehouseId", async () => {
    const service = new GetInventoryReportService(seed());
    const result = await service.execute({ warehouseId: WAREHOUSE_ONE_ID });
    expect(result.lines).toHaveLength(2);
  });

  it("filters inventory by lowStockOnly", async () => {
    const service = new GetInventoryReportService(seed());
    const result = await service.execute({ lowStockOnly: "true" });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.productCode).toBe("PROD-002");
  });

  it("filters inventory by overstockOnly", async () => {
    const service = new GetInventoryReportService(seed());
    const result = await service.execute({ overstockOnly: true });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.isOverstock).toBe(true);
  });

  it("filters procurement by supplierId", async () => {
    const service = new GetProcurementReportService(seed());
    const result = await service.execute({ supplierId: SUPPLIER_TWO_ID });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.supplierId).toBe(SUPPLIER_TWO_ID);
  });

  it("filters procurement by warehouseId and status", async () => {
    const service = new GetProcurementReportService(seed());
    const result = await service.execute({
      warehouseId: WAREHOUSE_ONE_ID,
      status: "APPROVED",
    });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.poNumber).toBe("PO-001");
  });

  it("filters repairs by warehouseId", async () => {
    const service = new GetRepairReportService(seed());
    const result = await service.execute({ warehouseId: WAREHOUSE_ONE_ID });
    expect(result.lines.every((line) => line.warehouseId === WAREHOUSE_ONE_ID))
      .toBe(true);
  });

  it("filters warehouse report by warehouseId", async () => {
    const service = new GetWarehouseReportService(seed());
    const result = await service.execute({ warehouseId: WAREHOUSE_TWO_ID });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.warehouseCode).toBe("WH-002");
  });

  it("filters supplier report by supplierId", async () => {
    const service = new GetSupplierReportService(seed());
    const result = await service.execute({ supplierId: SUPPLIER_ONE_ID });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.supplierId).toBe(SUPPLIER_ONE_ID);
  });

  it("searches rentals by customer name", async () => {
    const service = new GetRentalReportService(seed());
    const result = await service.execute({ search: "Beta" });
    expect(result.lines.every((line) => line.customerId === CUSTOMER_TWO_ID))
      .toBe(true);
  });
});
