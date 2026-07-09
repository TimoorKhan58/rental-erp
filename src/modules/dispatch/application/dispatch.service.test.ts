import { describe, expect, it, vi } from "vitest";

import { DispatchService } from "@/modules/dispatch/application/services/dispatch.service";

import {
  DISPATCH_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/dispatch.fixtures";

function createFacade() {
  const getDispatchById = { execute: vi.fn() };
  const listDispatches = { execute: vi.fn() };
  const createDispatch = { execute: vi.fn() };
  const updateDispatch = { execute: vi.fn() };
  const completeDispatch = { execute: vi.fn() };
  const cancelDispatch = { execute: vi.fn() };

  const service = new DispatchService(
    getDispatchById as never,
    listDispatches as never,
    createDispatch as never,
    updateDispatch as never,
    completeDispatch as never,
    cancelDispatch as never,
  );

  return {
    service,
    getDispatchById,
    listDispatches,
    createDispatch,
    updateDispatch,
    completeDispatch,
    cancelDispatch,
  };
}

describe("DispatchService facade", () => {
  it("delegates getById", async () => {
    const { service, getDispatchById } = createFacade();
    getDispatchById.execute.mockResolvedValue({ id: DISPATCH_ID });

    await service.getById({ id: DISPATCH_ID });

    expect(getDispatchById.execute).toHaveBeenCalledWith({
      id: DISPATCH_ID,
    });
  });

  it("delegates list", async () => {
    const { service, listDispatches } = createFacade();
    listDispatches.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listDispatches.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createDispatch } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createDispatch.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updateDispatch } = createFacade();

    await service.update({ id: DISPATCH_ID }, { remarks: "Updated" });

    expect(updateDispatch.execute).toHaveBeenCalled();
  });

  it("delegates complete", async () => {
    const { service, completeDispatch } = createFacade();

    await service.complete({ id: DISPATCH_ID });

    expect(completeDispatch.execute).toHaveBeenCalled();
  });

  it("delegates cancel", async () => {
    const { service, cancelDispatch } = createFacade();

    await service.cancel({ id: DISPATCH_ID });

    expect(cancelDispatch.execute).toHaveBeenCalled();
  });

  it("passes update input to update service", async () => {
    const { service, updateDispatch } = createFacade();

    await service.update(
      { id: DISPATCH_ID },
      { markReady: true, items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );

    expect(updateDispatch.execute).toHaveBeenCalledWith(
      { id: DISPATCH_ID },
      { markReady: true, items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );
  });
});
