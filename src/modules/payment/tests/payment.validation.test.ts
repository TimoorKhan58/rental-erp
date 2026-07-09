import { describe, expect, it } from "vitest";

import {
  CreatePaymentSchema,
  PaymentIdParamSchema,
  UpdatePaymentSchema,
} from "@/modules/payment/application/schemas/payment.schemas";
import { ListPaymentsSchema } from "@/modules/payment/application/schemas/list-payments.schema";

import {
  CUSTOMER_ID,
  PAYMENT_ID,
  RENTAL_INVOICE_ID,
  VALID_CREATE_INPUT,
} from "./helpers/payment.fixtures";

describe("CreatePaymentSchema", () => {
  it("accepts valid create input", () => {
    const result = CreatePaymentSchema.parse(VALID_CREATE_INPUT);

    expect(result.paymentNumber).toBe("PAY-2026-001");
    expect(result.amount).toBe(100);
    expect(result.paymentMethod).toBe("BANK_TRANSFER");
  });

  it("rejects invalid rental invoice id", () => {
    expect(() =>
      CreatePaymentSchema.parse({
        ...VALID_CREATE_INPUT,
        rentalInvoiceId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid customer id", () => {
    expect(() =>
      CreatePaymentSchema.parse({
        ...VALID_CREATE_INPUT,
        customerId: "bad",
      }),
    ).toThrow();
  });

  it("rejects non-positive amount", () => {
    expect(() =>
      CreatePaymentSchema.parse({
        ...VALID_CREATE_INPUT,
        amount: 0,
      }),
    ).toThrow();
  });

  it("rejects empty payment number", () => {
    expect(() =>
      CreatePaymentSchema.parse({
        ...VALID_CREATE_INPUT,
        paymentNumber: "",
      }),
    ).toThrow();
  });

  it("rejects invalid payment method", () => {
    expect(() =>
      CreatePaymentSchema.parse({
        ...VALID_CREATE_INPUT,
        paymentMethod: "INVALID",
      }),
    ).toThrow();
  });

  it("accepts null optional fields", () => {
    const result = CreatePaymentSchema.parse({
      ...VALID_CREATE_INPUT,
      referenceNumber: null,
      notes: null,
    });

    expect(result.referenceNumber).toBeNull();
    expect(result.notes).toBeNull();
  });

  it("accepts all valid payment methods", () => {
    for (const paymentMethod of [
      "CASH",
      "BANK_TRANSFER",
      "CHEQUE",
      "CARD",
      "ONLINE",
      "OTHER",
    ] as const) {
      const result = CreatePaymentSchema.parse({
        ...VALID_CREATE_INPUT,
        paymentMethod,
      });

      expect(result.paymentMethod).toBe(paymentMethod);
    }
  });

  it("coerces string amount to number", () => {
    const result = CreatePaymentSchema.parse({
      ...VALID_CREATE_INPUT,
      amount: "150",
    });

    expect(result.amount).toBe(150);
  });
});

describe("UpdatePaymentSchema", () => {
  it("accepts amount update", () => {
    const result = UpdatePaymentSchema.parse({ amount: 200 });

    expect(result.amount).toBe(200);
  });

  it("accepts payment method update", () => {
    const result = UpdatePaymentSchema.parse({ paymentMethod: "CASH" });

    expect(result.paymentMethod).toBe("CASH");
  });

  it("rejects empty update payload", () => {
    expect(() => UpdatePaymentSchema.parse({})).toThrow();
  });

  it("accepts notes update", () => {
    const result = UpdatePaymentSchema.parse({ notes: "Updated notes" });

    expect(result.notes).toBe("Updated notes");
  });

  it("accepts reference number update", () => {
    const result = UpdatePaymentSchema.parse({ referenceNumber: "REF-002" });

    expect(result.referenceNumber).toBe("REF-002");
  });

  it("rejects non-positive amount on update", () => {
    expect(() => UpdatePaymentSchema.parse({ amount: 0 })).toThrow();
  });

  it("accepts null reference number on update", () => {
    const result = UpdatePaymentSchema.parse({ referenceNumber: null });

    expect(result.referenceNumber).toBeNull();
  });
});

describe("PaymentIdParamSchema", () => {
  it("accepts valid payment id", () => {
    const result = PaymentIdParamSchema.parse({ id: PAYMENT_ID });

    expect(result.id).toBe(PAYMENT_ID);
  });

  it("rejects invalid payment id", () => {
    expect(() => PaymentIdParamSchema.parse({ id: "bad" })).toThrow();
  });
});

describe("ListPaymentsSchema", () => {
  it("accepts valid list query", () => {
    const result = ListPaymentsSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListPaymentsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "PENDING",
    });

    expect(result.status).toBe("PENDING");
  });

  it("accepts customer filter", () => {
    const result = ListPaymentsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      customerId: CUSTOMER_ID,
    });

    expect(result.customerId).toBe(CUSTOMER_ID);
  });

  it("accepts rental invoice filter", () => {
    const result = ListPaymentsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      rentalInvoiceId: RENTAL_INVOICE_ID,
    });

    expect(result.rentalInvoiceId).toBe(RENTAL_INVOICE_ID);
  });

  it("rejects search term over 200 characters", () => {
    expect(() =>
      ListPaymentsSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        search: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("accepts sortBy field", () => {
    const result = ListPaymentsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "asc",
      sortBy: "paymentDate",
    });

    expect(result.sortBy).toBe("paymentDate");
  });

  it("rejects invalid status filter", () => {
    expect(() =>
      ListPaymentsSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        status: "INVALID",
      }),
    ).toThrow();
  });
});
