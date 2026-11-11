import { AsyncLocalStorage } from "node:async_hooks";

import type { ReturnInspectionId } from "@/shared/domain/ids";

type RepairCapacityLockStore = {
  releases: Array<() => void>;
};

/** Holds in-memory repair-capacity mutex releases for the active UoW scope. */
export const repairCapacityLockAls =
  new AsyncLocalStorage<RepairCapacityLockStore>();

const mutexTailByReturnInspectionId = new Map<string, Promise<void>>();

/**
 * Phase 47 (N-46-01): serializes repair capacity commitment for one return
 * inspection in tests. Production uses PostgreSQL `SELECT … FOR UPDATE` on the
 * return_inspections row.
 */
export async function acquireRepairCapacityLock(
  returnInspectionId: ReturnInspectionId,
): Promise<void> {
  const previous =
    mutexTailByReturnInspectionId.get(returnInspectionId) ??
    Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  mutexTailByReturnInspectionId.set(
    returnInspectionId,
    previous.then(() => gate),
  );

  await previous;

  const store = repairCapacityLockAls.getStore();
  if (store !== undefined) {
    store.releases.push(release);
  } else {
    release();
  }
}

export function runWithRepairCapacityLockScope<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return repairCapacityLockAls.run({ releases: [] }, async () => {
    try {
      return await operation();
    } finally {
      const store = repairCapacityLockAls.getStore();
      if (store !== undefined) {
        for (const release of store.releases) {
          release();
        }
      }
    }
  });
}

/** Clears in-memory repair-capacity mutex state between tests. */
export function resetRepairCapacityLockForTests(): void {
  mutexTailByReturnInspectionId.clear();
}
