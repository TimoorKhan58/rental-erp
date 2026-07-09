import { describe, expect, it, vi } from "vitest";

import { PaymentService } from "@/modules/payment/application/services/payment.service";

import {
  PAYMENT_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/payment.fixtures";

function createFacade() {
  const getPaymentById = { execute: vi.fn() };
  const listPayments = { execute: vi.fn() };
  const createPayment = { execute: vi.fn() };
  const updatePayment = { execute: vi.fn() };
  const postPayment = { execute: vi.fn() };
  const voidPayment = { execute: vi.fn() };

  const service = new PaymentService(
    getPaymentById as never,
    listPayments as never,
    createPayment as never,
    updatePayment as never,
    postPayment as never,
    voidPayment as never,
  );

  return {
    service,
    getPaymentById,
    listPayments,
    createPayment,
    updatePayment,
    postPayment,
    voidPayment,
  };
}

describe("PaymentService facade", () => {
  it("delegates getById", async () => {
    const { service, getPaymentById } = createFacade();
    getPaymentById.execute.mockResolvedValue({ id: PAYMENT_ID });

    await service.getById({ id: PAYMENT_ID });

    expect(getPaymentById.execute).toHaveBeenCalledWith({ id: PAYMENT_ID });
  });

  it("delegates list", async () => {
    const { service, listPayments } = createFacade();
    listPayments.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listPayments.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createPayment } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createPayment.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updatePayment } = createFacade();

    await service.update({ id: PAYMENT_ID }, { amount: 200 });

    expect(updatePayment.execute).toHaveBeenCalled();
  });

  it("delegates post", async () => {
    const { service, postPayment } = createFacade();

    await service.post({ id: PAYMENT_ID });

    expect(postPayment.execute).toHaveBeenCalled();
  });

  it("delegates void", async () => {
    const { service, voidPayment } = createFacade();

    await service.void({ id: PAYMENT_ID });

    expect(voidPayment.execute).toHaveBeenCalled();
  });

  it("passes update input to update service", async () => {
    const { service, updatePayment } = createFacade();
    const updateInput = { notes: "Updated notes", amount: 150 };

    await service.update({ id: PAYMENT_ID }, updateInput);

    expect(updatePayment.execute).toHaveBeenCalledWith(
      { id: PAYMENT_ID },
      updateInput,
    );
  });

  it("passes create input to create service", async () => {
    const { service, createPayment } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createPayment.execute).toHaveBeenCalledWith(VALID_CREATE_INPUT);
  });
});
