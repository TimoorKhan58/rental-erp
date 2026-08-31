import { AsyncLocalStorage } from "node:async_hooks";

import type { DispatchId } from "@/shared/domain/ids";

type ReturnCapacityLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory return-capacity mutex releases for the active UoW scope. */
export const returnCapacityLockAls =
  new AsyncLocalStorage<ReturnCapacityLockStore>();

const mutexTailByDispatch = new Map<string, Promise<void>>();

/**
 * Phase 45 (N-44-01): serializes return capacity checks for one dispatch in
 * tests. Production uses PostgreSQL `SELECT … FOR UPDATE` on the dispatch row.
 */
export async function acquireReturnCapacityLock(
  dispatchId: DispatchId,
): Promise<void> {
  const previous = mutexTailByDispatch.get(dispatchId) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  mutexTailByDispatch.set(dispatchId, previous.then(() => gate));

  await previous;

  const store = returnCapacityLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithReturnCapacityLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return returnCapacityLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = returnCapacityLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}
