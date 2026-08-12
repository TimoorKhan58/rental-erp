export const EXTERNAL_RENTAL_MODULE = "external-rentals";
export const EXTERNAL_RENTAL_ENTITY_NAME = "ExternalRentalAgreement";
export const EXTERNAL_RENTAL_REFERENCE_TYPE = "EXTERNAL_RENTAL_AGREEMENT";

/**
 * Operational lifecycle (orthogonal to settlementStatus).
 * Locked by Phase 25.5.1 decision document.
 */
export const EXTERNAL_RENTAL_AGREEMENT_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "ALLOCATED",
  "IN_USE",
  "RETURN_PENDING",
  "RETURNED",
  "CANCELLED",
] as const;

export type ExternalRentalAgreementStatus =
  (typeof EXTERNAL_RENTAL_AGREEMENT_STATUSES)[number];

/**
 * Settlement is orthogonal to operational status (BD-10).
 */
export const EXTERNAL_RENTAL_SETTLEMENT_STATUSES = [
  "UNSETTLED",
  "PARTIALLY_SETTLED",
  "SETTLED",
] as const;

export type ExternalRentalSettlementStatus =
  (typeof EXTERNAL_RENTAL_SETTLEMENT_STATUSES)[number];

export const EXTERNAL_RENTAL_SEARCH_FIELDS = [
  "agreementNumber",
  "remarks",
] as const;

export const EXTERNAL_RENTAL_SORT_FIELDS = [
  "agreementNumber",
  "hireStartDate",
  "hireEndDate",
  "status",
  "settlementStatus",
  "createdAt",
] as const;

export type ExternalRentalSortField =
  (typeof EXTERNAL_RENTAL_SORT_FIELDS)[number];
