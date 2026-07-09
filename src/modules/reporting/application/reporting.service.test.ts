import { describe, expect, it, vi } from "vitest";

import { ReportingService } from "@/modules/reporting/application/services/reporting.service";

import {
  CUSTOMER_ONE_ID,
  SUPPLIER_ONE_ID,
  WAREHOUSE_ONE_ID,
} from "../tests/helpers/reporting.fixtures";

function createService() {
  const getDashboard = { execute: vi.fn().mockResolvedValue({ type: "dashboard" }) };
  const getInventoryReport = {
    execute: vi.fn().mockResolvedValue({ type: "inventory" }),
  };
  const getRentalReport = { execute: vi.fn().mockResolvedValue({ type: "rental" }) };
  const getDispatchReport = {
    execute: vi.fn().mockResolvedValue({ type: "dispatch" }),
  };
  const getReturnReport = { execute: vi.fn().mockResolvedValue({ type: "return" }) };
  const getRepairReport = { execute: vi.fn().mockResolvedValue({ type: "repair" }) };
  const getMaintenanceReport = {
    execute: vi.fn().mockResolvedValue({ type: "maintenance" }),
  };
  const getProcurementReport = {
    execute: vi.fn().mockResolvedValue({ type: "procurement" }),
  };
  const getCustomerReport = {
    execute: vi.fn().mockResolvedValue({ type: "customer" }),
  };
  const getSupplierReport = {
    execute: vi.fn().mockResolvedValue({ type: "supplier" }),
  };
  const getWarehouseReport = {
    execute: vi.fn().mockResolvedValue({ type: "warehouse" }),
  };
  const getProductReport = {
    execute: vi.fn().mockResolvedValue({ type: "product" }),
  };

  const service = new ReportingService(
    getDashboard as never,
    getInventoryReport as never,
    getRentalReport as never,
    getDispatchReport as never,
    getReturnReport as never,
    getRepairReport as never,
    getMaintenanceReport as never,
    getProcurementReport as never,
    getCustomerReport as never,
    getSupplierReport as never,
    getWarehouseReport as never,
    getProductReport as never,
  );

  return {
    service,
    getDashboard,
    getInventoryReport,
    getRentalReport,
    getDispatchReport,
    getReturnReport,
    getRepairReport,
    getMaintenanceReport,
    getProcurementReport,
    getCustomerReport,
    getSupplierReport,
    getWarehouseReport,
    getProductReport,
  };
}

describe("ReportingService facade", () => {
  it("delegates getDashboard", async () => {
    const { service, getDashboard } = createService();
    await expect(service.getDashboard({})).resolves.toEqual({ type: "dashboard" });
    expect(getDashboard.execute).toHaveBeenCalledWith({});
  });

  it("delegates getInventoryReport", async () => {
    const { service, getInventoryReport } = createService();
    await expect(service.getInventoryReport({})).resolves.toEqual({
      type: "inventory",
    });
    expect(getInventoryReport.execute).toHaveBeenCalled();
  });

  it("delegates getRentalReport", async () => {
    const { service, getRentalReport } = createService();
    await expect(service.getRentalReport({})).resolves.toEqual({ type: "rental" });
    expect(getRentalReport.execute).toHaveBeenCalled();
  });

  it("delegates getDispatchReport", async () => {
    const { service, getDispatchReport } = createService();
    await expect(service.getDispatchReport({})).resolves.toEqual({
      type: "dispatch",
    });
    expect(getDispatchReport.execute).toHaveBeenCalled();
  });

  it("delegates getReturnReport", async () => {
    const { service, getReturnReport } = createService();
    await expect(service.getReturnReport({})).resolves.toEqual({ type: "return" });
    expect(getReturnReport.execute).toHaveBeenCalled();
  });

  it("delegates getRepairReport", async () => {
    const { service, getRepairReport } = createService();
    await expect(service.getRepairReport({})).resolves.toEqual({ type: "repair" });
    expect(getRepairReport.execute).toHaveBeenCalled();
  });

  it("delegates getMaintenanceReport", async () => {
    const { service, getMaintenanceReport } = createService();
    await expect(service.getMaintenanceReport({})).resolves.toEqual({
      type: "maintenance",
    });
    expect(getMaintenanceReport.execute).toHaveBeenCalled();
  });

  it("delegates getProcurementReport", async () => {
    const { service, getProcurementReport } = createService();
    await expect(service.getProcurementReport({})).resolves.toEqual({
      type: "procurement",
    });
    expect(getProcurementReport.execute).toHaveBeenCalled();
  });

  it("delegates getCustomerReport", async () => {
    const { service, getCustomerReport } = createService();
    await expect(
      service.getCustomerReport({ customerId: CUSTOMER_ONE_ID }),
    ).resolves.toEqual({ type: "customer" });
    expect(getCustomerReport.execute).toHaveBeenCalled();
  });

  it("delegates getSupplierReport", async () => {
    const { service, getSupplierReport } = createService();
    await expect(
      service.getSupplierReport({ supplierId: SUPPLIER_ONE_ID }),
    ).resolves.toEqual({ type: "supplier" });
    expect(getSupplierReport.execute).toHaveBeenCalled();
  });

  it("delegates getWarehouseReport", async () => {
    const { service, getWarehouseReport } = createService();
    await expect(
      service.getWarehouseReport({ warehouseId: WAREHOUSE_ONE_ID }),
    ).resolves.toEqual({ type: "warehouse" });
    expect(getWarehouseReport.execute).toHaveBeenCalled();
  });

  it("delegates getProductReport", async () => {
    const { service, getProductReport } = createService();
    await expect(service.getProductReport({})).resolves.toEqual({
      type: "product",
    });
    expect(getProductReport.execute).toHaveBeenCalled();
  });
});
