import { describe, expect, it } from "vitest";

import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import {
  RentalInvoiceEligibilityError,
  RentalInvoiceInvalidStatusError,
} from "@/modules/rental-invoice/domain/rental-invoice.errors";
import {
  assertCanIssue,
  assertCanUpdate,
  assertCanVoid,
  assertCustomerMatchesRentalOrder,
  assertImmutablePaidInvoice,
  assertRentalOrderEligibleForInvoice,
} from "@/modules/rental-invoice/domain/rental-invoice.rules";

import {
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
  buildCreateRentalInvoiceData,
  buildIssuedRentalInvoiceEntity,
  buildPaidRentalInvoiceEntity,
  buildPartiallyPaidRentalInvoiceEntity,
  buildRentalInvoiceEntity,
  buildVoidRentalInvoiceEntity,
} from "../tests/helpers/rental-invoice.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows draft", () => {
    expect(() => assertCanUpdate("DRAFT")).not.toThrow();
  });

  it("assertCanUpdate rejects issued", () => {
    expect(() => assertCanUpdate("ISSUED")).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("assertCanUpdate rejects partially paid", () => {
    expect(() => assertCanUpdate("PARTIALLY_PAID")).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("assertCanUpdate rejects paid", () => {
    expect(() => assertCanUpdate("PAID")).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("assertCanIssue allows draft", () => {
    expect(() => assertCanIssue("DRAFT")).not.toThrow();
  });

  it("assertCanIssue rejects issued", () => {
    expect(() => assertCanIssue("ISSUED")).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("assertCanVoid allows draft", () => {
    expect(() => assertCanVoid("DRAFT")).not.toThrow();
  });

  it("assertCanVoid allows issued", () => {
    expect(() => assertCanVoid("ISSUED")).not.toThrow();
  });

  it("assertCanVoid allows partially paid", () => {
    expect(() => assertCanVoid("PARTIALLY_PAID")).not.toThrow();
  });

  it("assertCanVoid rejects paid", () => {
    expect(() => assertCanVoid("PAID")).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("assertCanVoid rejects void", () => {
    expect(() => assertCanVoid("VOID")).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("assertImmutablePaidInvoice rejects paid status", () => {
    expect(() => assertImmutablePaidInvoice("PAID")).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });
});

describe("rental order eligibility", () => {
  it("assertRentalOrderEligibleForInvoice accepts completed", () => {
    expect(() => assertRentalOrderEligibleForInvoice("COMPLETED")).not.toThrow();
  });

  it("assertRentalOrderEligibleForInvoice rejects non-completed", () => {
    expect(() => assertRentalOrderEligibleForInvoice("ACTIVE")).toThrow(
      RentalInvoiceEligibilityError,
    );
  });

  it("assertCustomerMatchesRentalOrder accepts matching customer", () => {
    expect(() =>
      assertCustomerMatchesRentalOrder(CUSTOMER_ID, CUSTOMER_ID),
    ).not.toThrow();
  });

  it("assertCustomerMatchesRentalOrder rejects mismatch", () => {
    expect(() =>
      assertCustomerMatchesRentalOrder(CUSTOMER_ID, OTHER_CUSTOMER_ID),
    ).toThrow(RentalInvoiceEligibilityError);
  });
});

describe("rental invoice entity edge cases", () => {
  it("transitions through draft to issued workflow", () => {
    const draft = buildRentalInvoiceEntity();
    const issued = draft.withIssued();

    expect(issued.status).toBe("ISSUED");
    expect(issued.issuedAt).not.toBeNull();
  });

  it("rejects void on paid entity", () => {
    const paid = buildPaidRentalInvoiceEntity();

    expect(() => paid.withVoided()).toThrow(RentalInvoiceInvalidStatusError);
  });

  it("rejects void on void entity", () => {
    const voided = buildVoidRentalInvoiceEntity();

    expect(() => voided.withVoided()).toThrow(RentalInvoiceInvalidStatusError);
  });

  it("allows void from partially paid", () => {
    const partiallyPaid = buildPartiallyPaidRentalInvoiceEntity();
    const voided = partiallyPaid.withVoided();

    expect(voided.status).toBe("VOID");
  });

  it("rejects issue from issued entity", () => {
    const issued = buildIssuedRentalInvoiceEntity();

    expect(() => issued.withIssued()).toThrow(RentalInvoiceInvalidStatusError);
  });

  it("normalizes optional notes to null on create", () => {
    const props = RentalInvoice.create(
      buildCreateRentalInvoiceData({ notes: "   " }),
    );

    expect(props.notes).toBeNull();
  });

  it("allows void from draft before issue", () => {
    const voided = buildRentalInvoiceEntity().withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.issuedAt).toBeNull();
  });
});
