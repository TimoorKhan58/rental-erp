import { AsyncLocalStorage } from "node:async_hooks";

import type { RentalOrderId } from "@/shared/domain/ids";

type DispatchClaimLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory dispatch-claim mutex releases for the active UoW scope. */
export const dispatchClaimLockAls =
  new AsyncLocalStorage<DispatchClaimLockStore>();

const mutexTailByRentalOrder = new Map<string, Promise<void>>();

/**
 * Phase 30 (F-05): serializes capacity checks for one rental order in tests.
 * Production uses PostgreSQL `SELECT … FOR UPDATE` on the parent row instead.
 */
export async function acquireDispatchClaimLock(
  rentalOrderId: RentalOrderId,
): Promise<void> {
  const previous = mutexTailByRentalOrder.get(rentalOrderId) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  mutexTailByRentalOrder.set(rentalOrderId, previous.then(() => gate));

  await previous;

  const store = dispatchClaimLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithDispatchClaimLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return dispatchClaimLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = dispatchClaimLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}
