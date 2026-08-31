import { PURCHASE_ORDER_ENTITY_NAME } from "@/modules/procurement/domain/purchase-order.constants";
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
import type { PurchaseOrderId } from "@/shared/domain/ids";
import {
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

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
  purchaseOrderId: PurchaseOrderId,
  payment: SupplierPayment,
  direction: "apply" | "reverse",
): Promise<PurchaseOrder> {
  const delta = direction === "apply" ? payment.amount : -payment.amount;
  const afterDelta = await purchaseOrderRepository.applyPaymentDelta(
    purchaseOrderId,
    delta,
  );

  if (afterDelta === null) {
    throw new ConcurrentUpdateError({
      entity: PURCHASE_ORDER_ENTITY_NAME,
      id: purchaseOrderId,
      action:
        direction === "apply"
          ? "apply supplier payment"
          : "reverse supplier payment",
    });
  }

  return afterDelta;
}
