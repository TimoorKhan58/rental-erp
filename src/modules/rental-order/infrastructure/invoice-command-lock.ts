import { AsyncLocalStorage } from "node:async_hooks";

import type { RentalOrderId } from "@/shared/domain/ids";

type InvoiceCommandLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory invoice-command mutex releases for the active UoW scope. */
export const invoiceCommandLockAls =
  new AsyncLocalStorage<InvoiceCommandLockStore>();

const mutexTailByRentalOrderId = new Map<string, Promise<void>>();

/**
 * Phase 37 (F-36-02): serializes same-order invoice create/generate commands in tests.
 * Production uses PostgreSQL `SELECT … FOR UPDATE` on the parent row instead.
 */
export async function acquireInvoiceCommandLock(
  rentalOrderId: RentalOrderId,
): Promise<void> {
  const previous =
    mutexTailByRentalOrderId.get(rentalOrderId) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  mutexTailByRentalOrderId.set(rentalOrderId, previous.then(() => gate));

  await previous;

  const store = invoiceCommandLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithInvoiceCommandLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return invoiceCommandLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = invoiceCommandLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}

/** Clears in-memory invoice-command mutex state between tests. */
export function resetInvoiceCommandLockForTests(): void {
  mutexTailByRentalOrderId.clear();
}
