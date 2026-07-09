import { describe, expect, it } from "vitest";

import { InMemoryPaymentRepository } from "./helpers/in-memory-payment.repository";
import {
  buildCreatePaymentData,
  buildPaymentEntity,
  buildPostedPaymentEntity,
  CUSTOMER_ID,
  PAYMENT_ID,
  OTHER_PAYMENT_ID,
  RENTAL_INVOICE_ID,
} from "./helpers/payment.fixtures";

describe("InMemoryPaymentRepository", () => {
  it("finds by payment number", async () => {
    const repository = new InMemoryPaymentRepository();
    repository.seed([buildPaymentEntity()]);

    const found = await repository.findByPaymentNumber("PAY-2026-001");

    expect(found?.id).toBe(PAYMENT_ID);
  });

  it("updates pending payment fields", async () => {
    const repository = new InMemoryPaymentRepository();
    repository.seed([buildPaymentEntity()]);

    const updated = await repository.update(PAYMENT_ID, {
      notes: "Updated notes",
      amount: 150,
    });

    expect(updated.notes).toBe("Updated notes");
    expect(updated.amount).toBe(150);
  });

  it("updates status with timestamps", async () => {
    const repository = new InMemoryPaymentRepository();
    const payment = buildPaymentEntity();
    repository.seed([payment]);
    const postedAt = new Date("2026-01-18T10:00:00.000Z");

    const updated = await repository.updateStatus(payment.id, {
      status: "POSTED",
      postedAt,
    });

    expect(updated.status).toBe("POSTED");
    expect(updated.postedAt).toEqual(postedAt);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryPaymentRepository();
    repository.seed([
      buildPaymentEntity(),
      buildPostedPaymentEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "POSTED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("POSTED");
  });

  it("creates payment in pending status", async () => {
    const repository = new InMemoryPaymentRepository();

    const created = await repository.create(buildCreatePaymentData());

    expect(created.status).toBe("PENDING");
    expect(repository.count()).toBe(1);
  });

  it("filters paged results by customer id", async () => {
    const repository = new InMemoryPaymentRepository();
    repository.seed([buildPaymentEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      customerId: CUSTOMER_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by rental invoice id", async () => {
    const repository = new InMemoryPaymentRepository();
    repository.seed([buildPaymentEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      rentalInvoiceId: RENTAL_INVOICE_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by search term", async () => {
    const repository = new InMemoryPaymentRepository();
    repository.seed([buildPaymentEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      search: "PAY-2026",
    });

    expect(result.items).toHaveLength(1);
  });

  it("sorts paged results by payment date", async () => {
    const repository = new InMemoryPaymentRepository();
    const earlier = buildPaymentEntity();
    const later = buildPaymentEntity({
      id: OTHER_PAYMENT_ID,
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
    });
    repository.seed([later, earlier]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      sortBy: "paymentDate",
    });

    expect(result.items).toHaveLength(2);
  });

  it("finds payment by id", async () => {
    const repository = new InMemoryPaymentRepository();
    repository.seed([buildPaymentEntity()]);

    const found = await repository.findById(PAYMENT_ID);

    expect(found?.paymentNumber).toBe("PAY-2026-001");
  });
});
