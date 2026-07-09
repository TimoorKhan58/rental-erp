import { describe, expect, it } from "vitest";

import { Payment } from "@/modules/payment/domain/payment.entity";
import {
  assertCanPost,
  assertCanUpdate,
  assertCanVoid,
  assertImmutablePostedPayment,
} from "@/modules/payment/domain/payment.rules";
import { PaymentInvalidStatusError } from "@/modules/payment/domain/payment.errors";

import {
  buildCreatePaymentData,
  buildPaymentEntity,
  buildPostedPaymentEntity,
  buildVoidPaymentEntity,
} from "../tests/helpers/payment.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows pending", () => {
    expect(() => assertCanUpdate("PENDING")).not.toThrow();
  });

  it("assertCanUpdate rejects posted", () => {
    expect(() => assertCanUpdate("POSTED")).toThrow(
      PaymentInvalidStatusError,
    );
  });

  it("assertCanUpdate rejects void", () => {
    expect(() => assertCanUpdate("VOID")).toThrow(
      PaymentInvalidStatusError,
    );
  });

  it("assertCanPost allows pending", () => {
    expect(() => assertCanPost("PENDING")).not.toThrow();
  });

  it("assertCanPost rejects posted", () => {
    expect(() => assertCanPost("POSTED")).toThrow(PaymentInvalidStatusError);
  });

  it("assertCanPost rejects void", () => {
    expect(() => assertCanPost("VOID")).toThrow(PaymentInvalidStatusError);
  });

  it("assertCanVoid allows pending", () => {
    expect(() => assertCanVoid("PENDING")).not.toThrow();
  });

  it("assertCanVoid allows posted", () => {
    expect(() => assertCanVoid("POSTED")).not.toThrow();
  });

  it("assertCanVoid rejects void", () => {
    expect(() => assertCanVoid("VOID")).toThrow(PaymentInvalidStatusError);
  });

  it("assertImmutablePostedPayment rejects posted", () => {
    expect(() => assertImmutablePostedPayment("POSTED")).toThrow(
      PaymentInvalidStatusError,
    );
  });

  it("assertImmutablePostedPayment allows pending", () => {
    expect(() => assertImmutablePostedPayment("PENDING")).not.toThrow();
  });
});

describe("payment entity edge cases", () => {
  it("transitions from pending to posted", () => {
    const pending = buildPaymentEntity();
    const posted = pending.withPosted();

    expect(posted.status).toBe("POSTED");
    expect(posted.postedAt).not.toBeNull();
    expect(posted.voidedAt).toBeNull();
  });

  it("transitions from pending to void without posting", () => {
    const pending = buildPaymentEntity();
    const voided = pending.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.postedAt).toBeNull();
    expect(voided.voidedAt).not.toBeNull();
  });

  it("transitions from posted to void", () => {
    const posted = buildPostedPaymentEntity();
    const voided = posted.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.postedAt).not.toBeNull();
    expect(voided.voidedAt).not.toBeNull();
  });

  it("rejects post on void payment", () => {
    const voided = buildVoidPaymentEntity();

    expect(() => voided.withPosted()).toThrow(PaymentInvalidStatusError);
  });

  it("rejects update on void payment", () => {
    const voided = buildVoidPaymentEntity();

    expect(() => voided.withUpdated({ amount: 50 })).toThrow(
      PaymentInvalidStatusError,
    );
  });

  it("create always sets pending status", () => {
    const props = Payment.create(buildCreatePaymentData());

    expect(props.status).toBe("PENDING");
    expect(props.postedAt).toBeNull();
    expect(props.voidedAt).toBeNull();
  });

  it("posted payment cannot be updated", () => {
    const posted = buildPostedPaymentEntity();

    expect(() => posted.assertCanUpdate()).toThrow(PaymentInvalidStatusError);
  });

  it("void payment cannot be voided again", () => {
    const voided = buildVoidPaymentEntity(true);

    expect(() => voided.withVoided()).toThrow(PaymentInvalidStatusError);
  });
});
