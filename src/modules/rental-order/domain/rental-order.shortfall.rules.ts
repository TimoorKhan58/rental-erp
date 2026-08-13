/**
 * Phase 26 — external sourcing shortfall (informational / orchestration gate).
 *
 * Uses F-02 `dateAwareAvailableQuantity` as owned fulfillable capacity.
 * Does NOT alter F-02 capacity math, inventory, or reservation semantics.
 *
 * Formula (locked):
 *   shortfallQuantity = max(0, requiredQuantity − dateAwareAvailableQuantity)
 *   remainingShortfallQuantity = max(0, shortfallQuantity − alreadyExternallyRequestedQuantity)
 */

export type ExternalSourcingShortfallInput = {
  requiredQuantity: number;
  dateAwareAvailableQuantity: number;
  alreadyExternallyRequestedQuantity?: number;
};

export type ExternalSourcingShortfallResult = {
  requiredQuantity: number;
  ownedFulfillableQuantity: number;
  shortfallQuantity: number;
  alreadyExternallyRequestedQuantity: number;
  remainingShortfallQuantity: number;
};

export function calculateExternalSourcingShortfall(
  input: ExternalSourcingShortfallInput,
): ExternalSourcingShortfallResult {
  const requiredQuantity = Math.max(0, Math.trunc(input.requiredQuantity));
  const dateAwareAvailableQuantity = Math.max(
    0,
    Math.trunc(input.dateAwareAvailableQuantity),
  );
  const alreadyExternallyRequestedQuantity = Math.max(
    0,
    Math.trunc(input.alreadyExternallyRequestedQuantity ?? 0),
  );

  const ownedFulfillableQuantity = Math.min(
    requiredQuantity,
    dateAwareAvailableQuantity,
  );
  const shortfallQuantity = Math.max(
    0,
    requiredQuantity - dateAwareAvailableQuantity,
  );
  const remainingShortfallQuantity = Math.max(
    0,
    shortfallQuantity - alreadyExternallyRequestedQuantity,
  );

  return {
    requiredQuantity,
    ownedFulfillableQuantity,
    shortfallQuantity,
    alreadyExternallyRequestedQuantity,
    remainingShortfallQuantity,
  };
}

/** Pre-dispatch statuses where sourcing an ERA for a shortfall is allowed. */
export const SOURCE_EXTERNALLY_ELIGIBLE_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "RESERVED",
] as const;

export type SourceExternallyEligibleStatus =
  (typeof SOURCE_EXTERNALLY_ELIGIBLE_STATUSES)[number];

export function isSourceExternallyEligibleStatus(
  status: string,
): status is SourceExternallyEligibleStatus {
  return (SOURCE_EXTERNALLY_ELIGIBLE_STATUSES as readonly string[]).includes(
    status,
  );
}
