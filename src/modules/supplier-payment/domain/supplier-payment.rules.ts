import type { PurchaseOrderStatus } from "@/modules/procurement/domain/purchase-order.constants";

import { ELIGIBLE_PURCHASE_ORDER_PAYMENT_STATUSES } from "./supplier-payment.constants";
import type { PaymentStatus } from "./supplier-payment.constants";
import {
  SupplierPaymentEligibilityError,
  SupplierPaymentInvalidStatusError,
  SupplierPaymentInvariantError,
  createSupplierPaymentNumber,
} from "./supplier-payment.errors";
import type {
  CreateSupplierPaymentData,
  SupplierPaymentProps,
} from "./supplier-payment.types";

export function validatePaymentAmount(amount: number): number {
  if (amount <= 0) {
    throw new SupplierPaymentInvariantError(
      "Payment amount must be greater than zero",
      "amount",
    );
  }

  return roundMoney(amount);
}

export function assertPaymentAmountWithinBalance(
  amount: number,
  purchaseOrderBalance: number,
): void {
  if (amount > purchaseOrderBalance) {
    throw new SupplierPaymentEligibilityError(
      "Payment amount exceeds purchase order balance",
    );
  }
}

export function assertPurchaseOrderEligibleForPayment(
  status: PurchaseOrderStatus,
): void {
  if (status === "CANCELLED") {
    throw new SupplierPaymentEligibilityError(
      "Cannot record payment against cancelled purchase order",
    );
  }

  if (
    !(ELIGIBLE_PURCHASE_ORDER_PAYMENT_STATUSES as readonly string[]).includes(
      status,
    )
  ) {
    throw new SupplierPaymentEligibilityError(
      `Purchase order must be APPROVED, PARTIALLY_RECEIVED, or RECEIVED to record payment (current: ${status})`,
    );
  }
}

export function assertSupplierMatchesPurchaseOrder(
  paymentSupplierId: string,
  purchaseOrderSupplierId: string,
): void {
  if (paymentSupplierId !== purchaseOrderSupplierId) {
    throw new SupplierPaymentEligibilityError(
      "Supplier does not match purchase order supplier",
    );
  }
}

export function assertCanPost(status: PaymentStatus): void {
  if (status !== "PENDING") {
    throw new SupplierPaymentInvalidStatusError(status, "post");
  }
}

export function assertCanVoid(status: PaymentStatus): void {
  if (status === "VOID") {
    throw new SupplierPaymentInvalidStatusError(status, "void");
  }
}

export function normalizeCreateSupplierPaymentData(
  data: CreateSupplierPaymentData,
): Omit<
  SupplierPaymentProps,
  "id" | "status" | "postedAt" | "voidedAt" | "createdAt" | "updatedAt"
> {
  return {
    paymentNumber: createSupplierPaymentNumber(data.paymentNumber),
    purchaseOrderId: data.purchaseOrderId,
    supplierId: data.supplierId,
    paymentDate: data.paymentDate,
    paymentMethod: data.paymentMethod,
    amount: validatePaymentAmount(data.amount),
    referenceNumber: normalizeOptionalText(data.referenceNumber),
    notes: normalizeOptionalText(data.notes),
    createdById: data.createdById,
  };
}

export function normalizeSupplierPaymentProps(
  props: SupplierPaymentProps,
): SupplierPaymentProps {
  return {
    ...props,
    paymentNumber: createSupplierPaymentNumber(props.paymentNumber),
    amount: validatePaymentAmount(props.amount),
    referenceNumber: normalizeOptionalText(props.referenceNumber),
    notes: normalizeOptionalText(props.notes),
  };
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
