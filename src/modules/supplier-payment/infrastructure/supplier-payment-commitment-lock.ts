import { AsyncLocalStorage } from "node:async_hooks";

import type { PurchaseOrderId } from "@/shared/domain/ids";

type SupplierPaymentCommitmentLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory supplier-payment-commitment mutex releases for the active UoW scope. */
export const supplierPaymentCommitmentLockAls =
  new AsyncLocalStorage<SupplierPaymentCommitmentLockStore>();

const mutexTailByPurchaseOrderId = new Map<string, Promise<void>>();

/**
 * Phase 46 (N-44-06): serializes pending supplier-payment commitment for one PO
 * in tests. Production uses PostgreSQL `SELECT … FOR UPDATE` on the PO row.
 */
export async function acquireSupplierPaymentCommitmentLock(
  purchaseOrderId: PurchaseOrderId,
): Promise<void> {
  const previous =
    mutexTailByPurchaseOrderId.get(purchaseOrderId) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  mutexTailByPurchaseOrderId.set(
    purchaseOrderId,
    previous.then(() => gate),
  );

  await previous;

  const store = supplierPaymentCommitmentLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithSupplierPaymentCommitmentLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return supplierPaymentCommitmentLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = supplierPaymentCommitmentLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}

/** Clears in-memory supplier-payment-commitment mutex state between tests. */
export function resetSupplierPaymentCommitmentLockForTests(): void {
  mutexTailByPurchaseOrderId.clear();
}
