/**
 * Simple stages for finding orders (usability revamp R3): each groups the
 * statuses a person thinks of together.
 */
export const RENTAL_ORDER_STAGES = ["drafts", "upcoming", "out", "late", "finished", "cancelled"] as const;
export type RentalOrderStage = (typeof RENTAL_ORDER_STAGES)[number];

export const RENTAL_ORDER_STAGE_STATUSES: Record<RentalOrderStage, readonly string[]> = {
  drafts: ["DRAFT"],
  upcoming: ["CONFIRMED", "RESERVED"],
  out: ["DISPATCHED", "ON_RENT", "PARTIALLY_RETURNED"],
  /** Out with the customer and past the return date. */
  late: ["DISPATCHED", "ON_RENT", "PARTIALLY_RETURNED"],
  finished: ["RETURNED", "COMPLETED"],
  cancelled: ["CANCELLED"],
};
