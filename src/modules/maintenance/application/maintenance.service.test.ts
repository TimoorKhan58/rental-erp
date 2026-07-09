import { describe, expect, it, vi } from "vitest";

import { MaintenanceService } from "@/modules/maintenance/application/services/maintenance.service";

import {
  MAINTENANCE_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/maintenance.fixtures";

function createFacade() {
  const getMaintenanceById = { execute: vi.fn() };
  const listMaintenances = { execute: vi.fn() };
  const createMaintenance = { execute: vi.fn() };
  const updateMaintenance = { execute: vi.fn() };
  const startMaintenance = { execute: vi.fn() };
  const completeMaintenance = { execute: vi.fn() };
  const cancelMaintenance = { execute: vi.fn() };

  const service = new MaintenanceService(
    getMaintenanceById as never,
    listMaintenances as never,
    createMaintenance as never,
    updateMaintenance as never,
    startMaintenance as never,
    completeMaintenance as never,
    cancelMaintenance as never,
  );

  return {
    service,
    getMaintenanceById,
    listMaintenances,
    createMaintenance,
    updateMaintenance,
    startMaintenance,
    completeMaintenance,
    cancelMaintenance,
  };
}

describe("MaintenanceService facade", () => {
  it("delegates getById", async () => {
    const { service, getMaintenanceById } = createFacade();
    getMaintenanceById.execute.mockResolvedValue({ id: MAINTENANCE_ID });

    await service.getById({ id: MAINTENANCE_ID });

    expect(getMaintenanceById.execute).toHaveBeenCalledWith({
      id: MAINTENANCE_ID,
    });
  });

  it("delegates list", async () => {
    const { service, listMaintenances } = createFacade();
    listMaintenances.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listMaintenances.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createMaintenance } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createMaintenance.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updateMaintenance } = createFacade();

    await service.update({ id: MAINTENANCE_ID }, { notes: "Updated" });

    expect(updateMaintenance.execute).toHaveBeenCalled();
  });

  it("delegates start", async () => {
    const { service, startMaintenance } = createFacade();

    await service.start({ id: MAINTENANCE_ID });

    expect(startMaintenance.execute).toHaveBeenCalled();
  });

  it("delegates complete", async () => {
    const { service, completeMaintenance } = createFacade();

    await service.complete({ id: MAINTENANCE_ID });

    expect(completeMaintenance.execute).toHaveBeenCalled();
  });

  it("delegates cancel", async () => {
    const { service, cancelMaintenance } = createFacade();

    await service.cancel({ id: MAINTENANCE_ID });

    expect(cancelMaintenance.execute).toHaveBeenCalled();
  });

  it("passes update input to update service", async () => {
    const { service, updateMaintenance } = createFacade();
    const updateInput = { notes: "Updated notes", estimatedCost: 100 };

    await service.update({ id: MAINTENANCE_ID }, updateInput);

    expect(updateMaintenance.execute).toHaveBeenCalledWith(
      { id: MAINTENANCE_ID },
      updateInput,
    );
  });
});
