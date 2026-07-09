import { describe, expect, it, vi } from "vitest";

import { RepairService } from "@/modules/repair/application/services/repair.service";

import {
  REPAIR_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/repair.fixtures";

function createFacade() {
  const getRepairById = { execute: vi.fn() };
  const listRepairs = { execute: vi.fn() };
  const createRepair = { execute: vi.fn() };
  const updateRepair = { execute: vi.fn() };
  const startRepair = { execute: vi.fn() };
  const completeRepair = { execute: vi.fn() };
  const cancelRepair = { execute: vi.fn() };

  const service = new RepairService(
    getRepairById as never,
    listRepairs as never,
    createRepair as never,
    updateRepair as never,
    startRepair as never,
    completeRepair as never,
    cancelRepair as never,
  );

  return {
    service,
    getRepairById,
    listRepairs,
    createRepair,
    updateRepair,
    startRepair,
    completeRepair,
    cancelRepair,
  };
}

describe("RepairService facade", () => {
  it("delegates getById", async () => {
    const { service, getRepairById } = createFacade();
    getRepairById.execute.mockResolvedValue({ id: REPAIR_ID });

    await service.getById({ id: REPAIR_ID });

    expect(getRepairById.execute).toHaveBeenCalledWith({
      id: REPAIR_ID,
    });
  });

  it("delegates list", async () => {
    const { service, listRepairs } = createFacade();
    listRepairs.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listRepairs.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createRepair } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createRepair.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updateRepair } = createFacade();

    await service.update({ id: REPAIR_ID }, { repairNotes: "Updated" });

    expect(updateRepair.execute).toHaveBeenCalled();
  });

  it("delegates start", async () => {
    const { service, startRepair } = createFacade();

    await service.start({ id: REPAIR_ID });

    expect(startRepair.execute).toHaveBeenCalled();
  });

  it("delegates complete", async () => {
    const { service, completeRepair } = createFacade();

    await service.complete({ id: REPAIR_ID });

    expect(completeRepair.execute).toHaveBeenCalled();
  });

  it("delegates cancel", async () => {
    const { service, cancelRepair } = createFacade();

    await service.cancel({ id: REPAIR_ID });

    expect(cancelRepair.execute).toHaveBeenCalled();
  });

  it("passes update input to update service", async () => {
    const { service, updateRepair } = createFacade();
    const updateInput = { repairNotes: "Updated notes", repairCost: 100 };

    await service.update({ id: REPAIR_ID }, updateInput);

    expect(updateRepair.execute).toHaveBeenCalledWith(
      { id: REPAIR_ID },
      updateInput,
    );
  });
});
