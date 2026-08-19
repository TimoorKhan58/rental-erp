import { AsyncLocalStorage } from "node:async_hooks";

import type { RentalOrderId } from "@/shared/domain/ids";

type ReserveCommandLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory reserve-command mutex releases for the active UoW scope. */
export const reserveCommandLockAls =
  new AsyncLocalStorage<ReserveCommandLockStore>();

const mutexTailByRentalOrderId = new Map<string, Promise<void>>();

/**
 * Phase 32 (F-32-01): serializes same-order reserve commands in tests.
 * Production uses PostgreSQL `SELECT … FOR UPDATE` on the parent row instead.
 */
export async function acquireReserveCommandLock(
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

  const store = reserveCommandLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithReserveCommandLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return reserveCommandLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = reserveCommandLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}
