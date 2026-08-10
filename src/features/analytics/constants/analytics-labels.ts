/**
 * Frozen Phase 24 display labels — never use bare "Revenue".
 * Keep in sync with docs/decisions/ANALYTICS_METRIC_CONTRACT_v1.0.md
 */
export const ANALYTICS_METRIC_LABELS = {
  bookedRentalValue: "Booked Rental Value",
  billedRevenue: "Billed Revenue",
  collectedCash: "Collected Cash",
  recognizedRevenue: "Recognized Revenue",
  outstandingAR: "Outstanding AR",
  activeRentals: "Active Rentals",
  upcomingRentals: "Upcoming Rentals",
  overdueRentals: "Overdue Rentals",
  completedRentals: "Completed Rentals",
  availableQuantity: "Available Quantity",
  reservedQuantity: "Reserved Quantity",
  newCustomers: "New Customers",
  orderedProcurementValue: "Ordered Procurement Value",
  assetsUnderMaintenance: "Assets Under Maintenance",
  rentalMaintenanceJobs: "Rental Maintenance Jobs",
  repairJobs: "Repair Jobs",
} as const;

/** Labels that must never appear as analytics KPIs on this page. */
export const FORBIDDEN_ANALYTICS_LABELS = [
  "Revenue",
  "Paid Invoice Amount",
  "Rented Quantity",
  "Physically On Rent",
] as const;

export const ANALYTICS_SCOPE_HINTS = {
  period: "Selected period",
  snapshot: "Current snapshot",
  overdueAttention: "Requires attention",
  arAttention: "Open balances",
  activeDefinition: "CONFIRMED + RESERVED (not physical on-rent)",
  upcomingDefinition: "Event start within next 14 UTC days",
  /** BD-1: bookingDate is the event-start envelope, not order creation. */
  bookedRentalValueDate: "Selected period · event-start (booking date)",
  /** Completed count is status-based and not date-filtered by the API. */
  completedRentals: "Current snapshot · all completed",
} as const;
