/** Mirrors AnalyticsOverviewDto from reporting — frontend display contract only. */
export type AnalyticsOverviewResponse = {
  period: {
    dateFrom: string;
    dateTo: string;
  };
  bookedRentalValue: number;
  billedRevenue: number;
  collectedCash: number;
  recognizedRevenue: number;
  rentals: {
    activeCount: number;
    upcomingCount: number;
    overdueCount: number;
    completedCount: number;
  };
  financial: {
    outstandingAR: number;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity: number;
  };
  customers: {
    newCount: number;
  };
  procurement: {
    orderedProcurementValue: number;
  };
  operations: {
    assetsUnderMaintenanceCount: number;
    rentalMaintenanceJobsOpenCount: number;
    repairJobsOpenCount: number;
  };
};

export type AnalyticsDateRangeParams = {
  dateFrom?: string;
  dateTo?: string;
};

/** Metric scope as defined by the frozen analytics contract. */
export type AnalyticsMetricScope = "period" | "snapshot";
