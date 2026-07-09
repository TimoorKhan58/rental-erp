import { describe, expect, it } from "vitest";

import { InMemoryRentalInvoiceRepository } from "./helpers/in-memory-rental-invoice.repository";
import {
  buildCreateRentalInvoiceData,
  buildIssuedRentalInvoiceEntity,
  buildRentalInvoiceEntity,
  CUSTOMER_ID,
  RENTAL_INVOICE_ID,
  RENTAL_ORDER_ID,
} from "./helpers/rental-invoice.fixtures";

describe("InMemoryRentalInvoiceRepository", () => {
  it("finds by invoice number", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);

    const found = await repository.findByInvoiceNumber("INV-2026-001");

    expect(found?.id).toBe(RENTAL_INVOICE_ID);
  });

  it("updates draft invoice fields", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);

    const updated = await repository.update(RENTAL_INVOICE_ID, {
      notes: "Updated notes",
    });

    expect(updated.notes).toBe("Updated notes");
  });

  it("updates status with timestamps", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    const invoice = buildRentalInvoiceEntity();
    repository.seed([invoice]);
    const issuedAt = new Date("2026-01-18T10:00:00.000Z");

    const updated = await repository.updateStatus(invoice.id, {
      status: "ISSUED",
      issuedAt,
    });

    expect(updated.status).toBe("ISSUED");
    expect(updated.issuedAt).toEqual(issuedAt);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([
      buildRentalInvoiceEntity(),
      buildIssuedRentalInvoiceEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "ISSUED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("ISSUED");
  });

  it("creates invoice in draft status", async () => {
    const repository = new InMemoryRentalInvoiceRepository();

    const created = await repository.create(buildCreateRentalInvoiceData());

    expect(created.status).toBe("DRAFT");
    expect(repository.count()).toBe(1);
  });

  it("filters paged results by customer id", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      customerId: CUSTOMER_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by rental order id", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      rentalOrderId: RENTAL_ORDER_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by search term", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      search: "INV-2026",
    });

    expect(result.items).toHaveLength(1);
  });

  it("sorts paged results by invoice date", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    const earlier = buildRentalInvoiceEntity();
    const later = buildRentalInvoiceEntity({
      id: "bb0e8400-e29b-41d4-a716-446655440002" as typeof RENTAL_INVOICE_ID,
    });
    repository.seed([later, earlier]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      sortBy: "invoiceDate",
    });

    expect(result.items).toHaveLength(2);
  });

  it("updates invoice items and recalculates totals", async () => {
    const repository = new InMemoryRentalInvoiceRepository();
    repository.seed([buildRentalInvoiceEntity()]);

    const updated = await repository.update(RENTAL_INVOICE_ID, {
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Updated rental",
          quantity: 1,
          unitPrice: 500,
        },
      ],
    });

    expect(updated.subtotal).toBe(500);
    expect(updated.grandTotal).toBe(500);
    expect(updated.items).toHaveLength(1);
  });
});
