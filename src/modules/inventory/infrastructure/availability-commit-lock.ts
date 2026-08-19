import { AsyncLocalStorage } from "node:async_hooks";

import type { InventoryId } from "@/shared/domain/ids";

type AvailabilityCommitLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory availability-commit mutex releases for the active UoW scope. */
export const availabilityCommitLockAls =
  new AsyncLocalStorage<AvailabilityCommitLockStore>();

const mutexTailByInventoryId = new Map<string, Promise<void>>();

/**
 * Phase 31 (F-31-01): serializes F-02 capacity checks for one inventory row in tests.
 * Production uses PostgreSQL `SELECT … FOR UPDATE` on the inventory row instead.
 */
export async function acquireAvailabilityCommitLock(
  inventoryId: InventoryId,
): Promise<void> {
  const previous =
    mutexTailByInventoryId.get(inventoryId) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  mutexTailByInventoryId.set(inventoryId, previous.then(() => gate));

  await previous;

  const store = availabilityCommitLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithAvailabilityCommitLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return availabilityCommitLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = availabilityCommitLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}
