import type { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";
import {
  PurchaseOrderInvalidStatusError,
} from "@/modules/procurement/domain";
import type { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";
import {
  assertPaymentAmountWithinBalance,
  assertPurchaseOrderEligibleForPayment,
  assertSupplierMatchesPurchaseOrder,
  SupplierPaymentEligibilityError,
} from "@/modules/supplier-payment/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

export function validatePurchaseOrderForSupplierPayment(
  purchaseOrder: PurchaseOrder,
  supplierId: string,
  amount: number,
): void {
  try {
    assertPurchaseOrderEligibleForPayment(purchaseOrder.status);
    assertSupplierMatchesPurchaseOrder(supplierId, purchaseOrder.supplierId);
    assertPaymentAmountWithinBalance(amount, purchaseOrder.getBalance());
  } catch (error) {
    if (
      error instanceof SupplierPaymentEligibilityError ||
      error instanceof PurchaseOrderInvalidStatusError
    ) {
      throw new UnprocessableError({
        message: error.message,
      });
    }

    throw error;
  }
}

export async function applyPaymentToPurchaseOrder(
  purchaseOrderRepository: IPurchaseOrderRepository,
  purchaseOrder: PurchaseOrder,
  payment: SupplierPayment,
  direction: "apply" | "reverse",
): Promise<PurchaseOrder> {
  const delta = direction === "apply" ? payment.amount : -payment.amount;
  const updated = purchaseOrder.withPaymentApplied(
    purchaseOrder.paidAmount + delta,
  );

  return purchaseOrderRepository.updatePaidAmount(
    purchaseOrder.id,
    updated.paidAmount,
  );
}
