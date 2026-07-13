import type { PaymentId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { PaymentStatus } from "./payment.constants";
import {
  assertCanPost,
  assertCanUpdate,
  assertCanVoid,
  normalizeCreatePaymentData,
  normalizePaymentProps,
  normalizeUpdatePaymentData,
  validatePaymentAmount,
} from "./payment.rules";
import type {
  CreatePaymentData,
  PaymentProps,
  UpdatePaymentData,
} from "./payment.types";

export class Payment implements Entity<PaymentId> {
  readonly id: PaymentId;
  readonly paymentNumber: string;
  readonly rentalInvoiceId: PaymentProps["rentalInvoiceId"];
  readonly customerId: PaymentProps["customerId"];
  readonly paymentDate: Date;
  readonly paymentMethod: PaymentProps["paymentMethod"];
  readonly amount: number;
  readonly isRefund: boolean;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
  readonly status: PaymentStatus;
  readonly postedAt: Date | null;
  readonly voidedAt: Date | null;
  readonly createdById: PaymentProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: PaymentProps) {
    const normalized = normalizePaymentProps(props);

    this.id = normalized.id;
    this.paymentNumber = normalized.paymentNumber;
    this.rentalInvoiceId = normalized.rentalInvoiceId;
    this.customerId = normalized.customerId;
    this.paymentDate = normalized.paymentDate;
    this.paymentMethod = normalized.paymentMethod;
    this.amount = normalized.amount;
    this.isRefund = normalized.isRefund;
    this.referenceNumber = normalized.referenceNumber;
    this.notes = normalized.notes;
    this.status = normalized.status;
    this.postedAt = normalized.postedAt;
    this.voidedAt = normalized.voidedAt;
    this.createdById = normalized.createdById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreatePaymentData,
  ): Omit<PaymentProps, "id" | "createdAt" | "updatedAt"> {
    const normalized = normalizeCreatePaymentData(data);

    return {
      ...normalized,
      status: "PENDING",
      postedAt: null,
      voidedAt: null,
    };
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props);
  }

  toProps(): PaymentProps {
    return {
      id: this.id,
      paymentNumber: this.paymentNumber,
      rentalInvoiceId: this.rentalInvoiceId,
      customerId: this.customerId,
      paymentDate: this.paymentDate,
      paymentMethod: this.paymentMethod,
      amount: this.amount,
      isRefund: this.isRefund,
      referenceNumber: this.referenceNumber,
      notes: this.notes,
      status: this.status,
      postedAt: this.postedAt,
      voidedAt: this.voidedAt,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withUpdated(data: UpdatePaymentData): Payment {
    assertCanUpdate(this.status);
    const normalized = normalizeUpdatePaymentData(data);

    return Payment.reconstitute({
      ...this.toProps(),
      paymentDate: normalized.paymentDate ?? this.paymentDate,
      paymentMethod: normalized.paymentMethod ?? this.paymentMethod,
      amount:
        normalized.amount !== undefined
          ? validatePaymentAmount(normalized.amount)
          : this.amount,
      referenceNumber:
        normalized.referenceNumber !== undefined
          ? normalized.referenceNumber
          : this.referenceNumber,
      notes: normalized.notes !== undefined ? normalized.notes : this.notes,
      updatedAt: new Date(),
    });
  }

  withPosted(): Payment {
    assertCanPost(this.status);

    return Payment.reconstitute({
      ...this.toProps(),
      status: "POSTED",
      postedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  withVoided(): Payment {
    assertCanVoid(this.status);

    return Payment.reconstitute({
      ...this.toProps(),
      status: "VOID",
      voidedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  isPosted(): boolean {
    return this.status === "POSTED";
  }
}
