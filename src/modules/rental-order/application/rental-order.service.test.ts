import { describe, expect, it, vi } from "vitest";

import { RentalOrderService } from "@/modules/rental-order/application/services/rental-order.service";

import {
  RENTAL_ORDER_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/rental-order.fixtures";

function createFacade() {
  const getRentalOrderById = { execute: vi.fn() };
  const listRentalOrders = { execute: vi.fn() };
  const createRentalOrder = { execute: vi.fn() };
  const updateRentalOrder = { execute: vi.fn() };
  const confirmRentalOrder = { execute: vi.fn() };
  const reserveRentalOrder = { execute: vi.fn() };
  const cancelRentalOrder = { execute: vi.fn() };

  const service = new RentalOrderService(
    getRentalOrderById as never,
    listRentalOrders as never,
    createRentalOrder as never,
    updateRentalOrder as never,
    confirmRentalOrder as never,
    reserveRentalOrder as never,
    cancelRentalOrder as never,
  );

  return {
    service,
    getRentalOrderById,
    listRentalOrders,
    createRentalOrder,
    updateRentalOrder,
    confirmRentalOrder,
    reserveRentalOrder,
    cancelRentalOrder,
  };
}

describe("RentalOrderService facade", () => {
  it("delegates getById", async () => {
    const { service, getRentalOrderById } = createFacade();
    getRentalOrderById.execute.mockResolvedValue({ id: RENTAL_ORDER_ID });

    await service.getById({ id: RENTAL_ORDER_ID });

    expect(getRentalOrderById.execute).toHaveBeenCalledWith({
      id: RENTAL_ORDER_ID,
    });
  });

  it("delegates list", async () => {
    const { service, listRentalOrders } = createFacade();
    listRentalOrders.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listRentalOrders.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createRentalOrder } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createRentalOrder.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updateRentalOrder } = createFacade();

    await service.update({ id: RENTAL_ORDER_ID }, { remarks: "Updated" });

    expect(updateRentalOrder.execute).toHaveBeenCalled();
  });

  it("delegates confirm", async () => {
    const { service, confirmRentalOrder } = createFacade();

    await service.confirm({ id: RENTAL_ORDER_ID });

    expect(confirmRentalOrder.execute).toHaveBeenCalled();
  });

  it("delegates reserve", async () => {
    const { service, reserveRentalOrder } = createFacade();

    await service.reserve(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );

    expect(reserveRentalOrder.execute).toHaveBeenCalled();
  });

  it("delegates cancel", async () => {
    const { service, cancelRentalOrder } = createFacade();

    await service.cancel({ id: RENTAL_ORDER_ID });

    expect(cancelRentalOrder.execute).toHaveBeenCalled();
  });
});
