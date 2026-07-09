import { describe, expect, it, vi } from "vitest";

import { PurchaseOrderService } from "@/modules/procurement/application/services/purchase-order.service";

import {
  PURCHASE_ORDER_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/purchase-order.fixtures";

function createFacade() {
  const getPurchaseOrderById = { execute: vi.fn() };
  const listPurchaseOrders = { execute: vi.fn() };
  const createPurchaseOrder = { execute: vi.fn() };
  const updatePurchaseOrder = { execute: vi.fn() };
  const approvePurchaseOrder = { execute: vi.fn() };
  const receivePurchaseOrder = { execute: vi.fn() };
  const cancelPurchaseOrder = { execute: vi.fn() };

  const service = new PurchaseOrderService(
    getPurchaseOrderById as never,
    listPurchaseOrders as never,
    createPurchaseOrder as never,
    updatePurchaseOrder as never,
    approvePurchaseOrder as never,
    receivePurchaseOrder as never,
    cancelPurchaseOrder as never,
  );

  return {
    service,
    getPurchaseOrderById,
    listPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
  };
}

describe("PurchaseOrderService facade", () => {
  it("delegates getById", async () => {
    const { service, getPurchaseOrderById } = createFacade();
    getPurchaseOrderById.execute.mockResolvedValue({ id: PURCHASE_ORDER_ID });

    await service.getById({ id: PURCHASE_ORDER_ID });

    expect(getPurchaseOrderById.execute).toHaveBeenCalledWith({
      id: PURCHASE_ORDER_ID,
    });
  });

  it("delegates list", async () => {
    const { service, listPurchaseOrders } = createFacade();
    listPurchaseOrders.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listPurchaseOrders.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createPurchaseOrder } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createPurchaseOrder.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updatePurchaseOrder } = createFacade();

    await service.update({ id: PURCHASE_ORDER_ID }, { remarks: "Updated" });

    expect(updatePurchaseOrder.execute).toHaveBeenCalled();
  });

  it("delegates approve", async () => {
    const { service, approvePurchaseOrder } = createFacade();

    await service.approve({ id: PURCHASE_ORDER_ID });

    expect(approvePurchaseOrder.execute).toHaveBeenCalled();
  });

  it("delegates receive", async () => {
    const { service, receivePurchaseOrder } = createFacade();

    await service.receive(
      { id: PURCHASE_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );

    expect(receivePurchaseOrder.execute).toHaveBeenCalled();
  });

  it("delegates cancel", async () => {
    const { service, cancelPurchaseOrder } = createFacade();

    await service.cancel({ id: PURCHASE_ORDER_ID });

    expect(cancelPurchaseOrder.execute).toHaveBeenCalled();
  });
});
