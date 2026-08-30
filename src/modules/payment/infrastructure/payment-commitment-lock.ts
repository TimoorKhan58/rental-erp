import { AsyncLocalStorage } from "node:async_hooks";

import type { RentalInvoiceId } from "@/shared/domain/ids";

type PaymentCommitmentLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory payment-commitment mutex releases for the active UoW scope. */
export const paymentCommitmentLockAls =
  new AsyncLocalStorage<PaymentCommitmentLockStore>();

const mutexTailByRentalInvoiceId = new Map<string, Promise<void>>();

/**
 * Phase 39 (F-36-03): serializes pending-payment commitment for one invoice in tests.
 * Production uses PostgreSQL `SELECT … FOR UPDATE` on the invoice row instead.
 */
export async function acquirePaymentCommitmentLock(
  rentalInvoiceId: RentalInvoiceId,
): Promise<void> {
  const previous =
    mutexTailByRentalInvoiceId.get(rentalInvoiceId) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  mutexTailByRentalInvoiceId.set(
    rentalInvoiceId,
    previous.then(() => gate),
  );

  await previous;

  const store = paymentCommitmentLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithPaymentCommitmentLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return paymentCommitmentLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = paymentCommitmentLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}

/** Clears in-memory payment-commitment mutex state between tests. */
export function resetPaymentCommitmentLockForTests(): void {
  mutexTailByRentalInvoiceId.clear();
}
