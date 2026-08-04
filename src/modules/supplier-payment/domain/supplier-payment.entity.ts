import type { SupplierPaymentId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { PaymentStatus } from "./supplier-payment.constants";
import {
  assertCanPost,
  assertCanVoid,
  normalizeCreateSupplierPaymentData,
  normalizeSupplierPaymentProps,
} from "./supplier-payment.rules";
import type {
  CreateSupplierPaymentData,
  SupplierPaymentProps,
} from "./supplier-payment.types";

export class SupplierPayment implements Entity<SupplierPaymentId> {
  readonly id: SupplierPaymentId;
  readonly paymentNumber: string;
  readonly purchaseOrderId: SupplierPaymentProps["purchaseOrderId"];
  readonly supplierId: SupplierPaymentProps["supplierId"];
  readonly paymentDate: Date;
  readonly paymentMethod: SupplierPaymentProps["paymentMethod"];
  readonly amount: number;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
  readonly status: PaymentStatus;
  readonly postedAt: Date | null;
  readonly voidedAt: Date | null;
  readonly createdById: SupplierPaymentProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SupplierPaymentProps) {
    const normalized = normalizeSupplierPaymentProps(props);

    this.id = normalized.id;
    this.paymentNumber = normalized.paymentNumber;
    this.purchaseOrderId = normalized.purchaseOrderId;
    this.supplierId = normalized.supplierId;
    this.paymentDate = normalized.paymentDate;
    this.paymentMethod = normalized.paymentMethod;
    this.amount = normalized.amount;
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
    data: CreateSupplierPaymentData,
  ): Omit<SupplierPaymentProps, "id" | "createdAt" | "updatedAt"> {
    const normalized = normalizeCreateSupplierPaymentData(data);

    return {
      ...normalized,
      status: "PENDING",
      postedAt: null,
      voidedAt: null,
    };
  }

  static reconstitute(props: SupplierPaymentProps): SupplierPayment {
    return new SupplierPayment(props);
  }

  toProps(): SupplierPaymentProps {
    return {
      id: this.id,
      paymentNumber: this.paymentNumber,
      purchaseOrderId: this.purchaseOrderId,
      supplierId: this.supplierId,
      paymentDate: this.paymentDate,
      paymentMethod: this.paymentMethod,
      amount: this.amount,
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

  withPosted(): SupplierPayment {
    assertCanPost(this.status);

    return SupplierPayment.reconstitute({
      ...this.toProps(),
      status: "POSTED",
      postedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  withVoided(): SupplierPayment {
    assertCanVoid(this.status);

    return SupplierPayment.reconstitute({
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
