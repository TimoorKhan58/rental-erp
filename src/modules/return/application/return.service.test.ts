import { describe, expect, it, vi } from "vitest";

import { ReturnService } from "@/modules/return/application/services/return.service";

import {
  ITEM_ID,
  RETURN_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/return.fixtures";

function createFacade() {
  const getReturnById = { execute: vi.fn() };
  const listReturns = { execute: vi.fn() };
  const createReturn = { execute: vi.fn() };
  const updateReturn = { execute: vi.fn() };
  const receiveReturn = { execute: vi.fn() };
  const inspectReturn = { execute: vi.fn() };
  const completeReturn = { execute: vi.fn() };
  const cancelReturn = { execute: vi.fn() };

  const service = new ReturnService(
    getReturnById as never,
    listReturns as never,
    createReturn as never,
    updateReturn as never,
    receiveReturn as never,
    inspectReturn as never,
    completeReturn as never,
    cancelReturn as never,
  );

  return {
    service,
    getReturnById,
    listReturns,
    createReturn,
    updateReturn,
    receiveReturn,
    inspectReturn,
    completeReturn,
    cancelReturn,
  };
}

describe("ReturnService facade", () => {
  it("delegates getById", async () => {
    const { service, getReturnById } = createFacade();
    getReturnById.execute.mockResolvedValue({ id: RETURN_ID });

    await service.getById({ id: RETURN_ID });

    expect(getReturnById.execute).toHaveBeenCalledWith({
      id: RETURN_ID,
    });
  });

  it("delegates list", async () => {
    const { service, listReturns } = createFacade();
    listReturns.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listReturns.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createReturn } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createReturn.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updateReturn } = createFacade();

    await service.update({ id: RETURN_ID }, { remarks: "Updated" });

    expect(updateReturn.execute).toHaveBeenCalled();
  });

  it("delegates receive", async () => {
    const { service, receiveReturn } = createFacade();

    await service.receive({ id: RETURN_ID });

    expect(receiveReturn.execute).toHaveBeenCalled();
  });

  it("delegates inspect", async () => {
    const { service, inspectReturn } = createFacade();

    await service.inspect(
      { id: RETURN_ID },
      {
        items: [
          {
            rentalOrderItemId: ITEM_ID,
            goodQuantity: 3,
            damagedQuantity: 1,
            lostQuantity: 1,
          },
        ],
      },
    );

    expect(inspectReturn.execute).toHaveBeenCalled();
  });

  it("delegates complete", async () => {
    const { service, completeReturn } = createFacade();

    await service.complete({ id: RETURN_ID });

    expect(completeReturn.execute).toHaveBeenCalled();
  });

  it("delegates cancel", async () => {
    const { service, cancelReturn } = createFacade();

    await service.cancel({ id: RETURN_ID });

    expect(cancelReturn.execute).toHaveBeenCalled();
  });

  it("passes inspect input to inspect service", async () => {
    const { service, inspectReturn } = createFacade();
    const inspectInput = {
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          goodQuantity: 4,
          damagedQuantity: 1,
          lostQuantity: 0,
        },
      ],
    };

    await service.inspect({ id: RETURN_ID }, inspectInput);

    expect(inspectReturn.execute).toHaveBeenCalledWith(
      { id: RETURN_ID },
      inspectInput,
    );
  });
});
