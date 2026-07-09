import { describe, expect, it, vi } from "vitest";

import { RentalInvoiceService } from "@/modules/rental-invoice/application/services/rental-invoice.service";

import {
  RENTAL_INVOICE_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/rental-invoice.fixtures";

function createFacade() {
  const getRentalInvoiceById = { execute: vi.fn() };
  const listRentalInvoices = { execute: vi.fn() };
  const createRentalInvoice = { execute: vi.fn() };
  const updateRentalInvoice = { execute: vi.fn() };
  const issueRentalInvoice = { execute: vi.fn() };
  const voidRentalInvoice = { execute: vi.fn() };

  const service = new RentalInvoiceService(
    getRentalInvoiceById as never,
    listRentalInvoices as never,
    createRentalInvoice as never,
    updateRentalInvoice as never,
    issueRentalInvoice as never,
    voidRentalInvoice as never,
  );

  return {
    service,
    getRentalInvoiceById,
    listRentalInvoices,
    createRentalInvoice,
    updateRentalInvoice,
    issueRentalInvoice,
    voidRentalInvoice,
  };
}

describe("RentalInvoiceService facade", () => {
  it("delegates getById", async () => {
    const { service, getRentalInvoiceById } = createFacade();
    getRentalInvoiceById.execute.mockResolvedValue({ id: RENTAL_INVOICE_ID });

    await service.getById({ id: RENTAL_INVOICE_ID });

    expect(getRentalInvoiceById.execute).toHaveBeenCalledWith({
      id: RENTAL_INVOICE_ID,
    });
  });

  it("delegates list", async () => {
    const { service, listRentalInvoices } = createFacade();
    listRentalInvoices.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listRentalInvoices.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createRentalInvoice } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createRentalInvoice.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updateRentalInvoice } = createFacade();

    await service.update({ id: RENTAL_INVOICE_ID }, { notes: "Updated" });

    expect(updateRentalInvoice.execute).toHaveBeenCalled();
  });

  it("delegates issue", async () => {
    const { service, issueRentalInvoice } = createFacade();

    await service.issue({ id: RENTAL_INVOICE_ID });

    expect(issueRentalInvoice.execute).toHaveBeenCalled();
  });

  it("delegates void", async () => {
    const { service, voidRentalInvoice } = createFacade();

    await service.void({ id: RENTAL_INVOICE_ID });

    expect(voidRentalInvoice.execute).toHaveBeenCalled();
  });

  it("passes update input to update service", async () => {
    const { service, updateRentalInvoice } = createFacade();
    const updateInput = { notes: "Updated notes" };

    await service.update({ id: RENTAL_INVOICE_ID }, updateInput);

    expect(updateRentalInvoice.execute).toHaveBeenCalledWith(
      { id: RENTAL_INVOICE_ID },
      updateInput,
    );
  });

  it("passes create input to create service", async () => {
    const { service, createRentalInvoice } = createFacade();

    await service.create(VALID_CREATE_INPUT as never);

    expect(createRentalInvoice.execute).toHaveBeenCalledWith(
      VALID_CREATE_INPUT,
    );
  });
});
