import { describe, expect, it } from "vitest";

import { Payment } from "@/modules/payment/domain/payment.entity";
import {
  PaymentEligibilityError,
  PaymentInvalidStatusError,
  PaymentInvariantError,
  createPaymentNumber,
} from "@/modules/payment/domain/payment.errors";
import {
  assertCustomerMatchesInvoice,
  assertInvoiceEligibleForPayment,
  assertPaymentAmountWithinBalance,
  validatePaymentAmount,
} from "@/modules/payment/domain/payment.rules";

import {
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
  buildCreatePaymentData,
  buildPaymentEntity,
  buildPostedPaymentEntity,
  buildVoidPaymentEntity,
} from "../tests/helpers/payment.fixtures";

describe("Payment entity", () => {
  it("creates normalized payment props", () => {
    const props = Payment.create(buildCreatePaymentData());

    expect(props.paymentNumber).toBe("PAY-2026-001");
    expect(props.amount).toBe(100);
    expect(props.paymentMethod).toBe("BANK_TRANSFER");
    expect(props.status).toBe("PENDING");
    expect(props.postedAt).toBeNull();
    expect(props.voidedAt).toBeNull();
  });

  it("rejects empty payment number", () => {
    expect(() =>
      Payment.create(buildCreatePaymentData({ paymentNumber: "   " })),
    ).toThrow(PaymentInvariantError);
  });

  it("rejects non-positive amount", () => {
    expect(() =>
      Payment.create(buildCreatePaymentData({ amount: 0 })),
    ).toThrow(PaymentInvariantError);
  });

  it("rejects negative amount", () => {
    expect(() =>
      Payment.create(buildCreatePaymentData({ amount: -50 })),
    ).toThrow(PaymentInvariantError);
  });

  it("rounds amount to two decimal places", () => {
    const props = Payment.create(
      buildCreatePaymentData({ amount: 99.999 }),
    );

    expect(props.amount).toBe(100);
  });

  it("reconstitutes persisted payment", () => {
    const payment = buildPaymentEntity();

    expect(payment.toProps().paymentNumber).toBe("PAY-2026-001");
    expect(payment.status).toBe("PENDING");
  });

  it("normalizes optional text fields to null", () => {
    const props = Payment.create(
      buildCreatePaymentData({
        referenceNumber: "   ",
        notes: "  ",
      }),
    );

    expect(props.referenceNumber).toBeNull();
    expect(props.notes).toBeNull();
  });

  it("trims payment number on create", () => {
    const props = Payment.create(
      buildCreatePaymentData({ paymentNumber: "  PAY-2026-002  " }),
    );

    expect(props.paymentNumber).toBe("PAY-2026-002");
  });

  it("updates pending payment", () => {
    const payment = buildPaymentEntity();
    const updated = payment.withUpdated({
      amount: 150,
      notes: "Updated notes",
      paymentMethod: "CASH",
    });

    expect(updated.amount).toBe(150);
    expect(updated.notes).toBe("Updated notes");
    expect(updated.paymentMethod).toBe("CASH");
  });

  it("rejects update when not pending", () => {
    const payment = buildPostedPaymentEntity();

    expect(() => payment.withUpdated({ amount: 150 })).toThrow(
      PaymentInvalidStatusError,
    );
  });

  it("posts pending payment", () => {
    const payment = buildPaymentEntity();
    const posted = payment.withPosted();

    expect(posted.status).toBe("POSTED");
    expect(posted.postedAt).not.toBeNull();
  });

  it("rejects post when not pending", () => {
    const payment = buildPostedPaymentEntity();

    expect(() => payment.withPosted()).toThrow(PaymentInvalidStatusError);
  });

  it("voids pending payment", () => {
    const payment = buildPaymentEntity();
    const voided = payment.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.voidedAt).not.toBeNull();
  });

  it("voids posted payment", () => {
    const payment = buildPostedPaymentEntity();
    const voided = payment.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.voidedAt).not.toBeNull();
  });

  it("rejects void when already void", () => {
    const payment = buildVoidPaymentEntity();

    expect(() => payment.withVoided()).toThrow(PaymentInvalidStatusError);
  });

  it("isPosted returns true for posted payment", () => {
    expect(buildPostedPaymentEntity().isPosted()).toBe(true);
  });

  it("isPosted returns false for pending payment", () => {
    expect(buildPaymentEntity().isPosted()).toBe(false);
  });

  it("assertCanUpdate allows pending only", () => {
    expect(() => buildPaymentEntity().assertCanUpdate()).not.toThrow();
    expect(() => buildPostedPaymentEntity().assertCanUpdate()).toThrow(
      PaymentInvalidStatusError,
    );
  });

  it("preserves unchanged fields on partial update", () => {
    const payment = buildPaymentEntity();
    const updated = payment.withUpdated({ notes: "Only notes changed" });

    expect(updated.amount).toBe(payment.amount);
    expect(updated.paymentMethod).toBe(payment.paymentMethod);
    expect(updated.notes).toBe("Only notes changed");
  });

  it("clears reference number when set to null", () => {
    const payment = buildPaymentEntity();
    const updated = payment.withUpdated({ referenceNumber: null });

    expect(updated.referenceNumber).toBeNull();
  });
});

describe("Payment rules", () => {
  it("validates positive payment amount", () => {
    expect(validatePaymentAmount(50)).toBe(50);
    expect(() => validatePaymentAmount(0)).toThrow(PaymentInvariantError);
  });

  it("asserts payment amount within invoice balance", () => {
    expect(() => assertPaymentAmountWithinBalance(100, 350)).not.toThrow();
    expect(() => assertPaymentAmountWithinBalance(400, 350)).toThrow(
      PaymentEligibilityError,
    );
  });

  it("asserts invoice eligible for payment", () => {
    expect(() => assertInvoiceEligibleForPayment("ISSUED")).not.toThrow();
    expect(() =>
      assertInvoiceEligibleForPayment("PARTIALLY_PAID"),
    ).not.toThrow();
    expect(() => assertInvoiceEligibleForPayment("DRAFT")).toThrow(
      PaymentEligibilityError,
    );
    expect(() => assertInvoiceEligibleForPayment("VOID")).toThrow(
      PaymentEligibilityError,
    );
  });

  it("asserts customer matches invoice", () => {
    expect(() =>
      assertCustomerMatchesInvoice(CUSTOMER_ID, CUSTOMER_ID),
    ).not.toThrow();
    expect(() =>
      assertCustomerMatchesInvoice(OTHER_CUSTOMER_ID, CUSTOMER_ID),
    ).toThrow(PaymentEligibilityError);
  });

  it("createPaymentNumber trims and validates", () => {
    expect(createPaymentNumber("  PAY-001  ")).toBe("PAY-001");
    expect(() => createPaymentNumber("   ")).toThrow(PaymentInvariantError);
  });

  it("accepts all payment methods on create", () => {
    for (const paymentMethod of [
      "CASH",
      "BANK_TRANSFER",
      "CHEQUE",
      "CARD",
      "ONLINE",
      "OTHER",
    ] as const) {
      const props = Payment.create(
        buildCreatePaymentData({ paymentMethod }),
      );

      expect(props.paymentMethod).toBe(paymentMethod);
    }
  });

  it("toProps returns full payment state", () => {
    const payment = buildPaymentEntity();
    const props = payment.toProps();

    expect(props.id).toBe(payment.id);
    expect(props.paymentNumber).toBe("PAY-2026-001");
    expect(props.status).toBe("PENDING");
  });

  it("rejects paid invoice for payment eligibility", () => {
    expect(() => assertInvoiceEligibleForPayment("PAID")).toThrow(
      PaymentEligibilityError,
    );
  });

  it("rejects exact balance overflow by one cent", () => {
    expect(() => assertPaymentAmountWithinBalance(350.01, 350)).toThrow(
      PaymentEligibilityError,
    );
  });

  it("allows payment equal to invoice balance", () => {
    expect(() => assertPaymentAmountWithinBalance(350, 350)).not.toThrow();
  });
});
