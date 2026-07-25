export type RentalInsightsProductLine = {
  productId: string;
  productCode: string;
  productName: string;
  revenue: number;
  rentalCount: number;
  quantityDays: number;
  rentedQuantity: number;
};

export type RentalInsightsUtilizationProductLine = {
  productId: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
  utilizationPercent: number;
};

export type ArAgingBucketKey =
  | "current"
  | "d1_30"
  | "d31_60"
  | "d61_90"
  | "d90_plus";

export type RentalInsightsArAgingBucket = {
  key: ArAgingBucketKey;
  label: string;
  invoiceCount: number;
  balance: number;
};

export type RentalInsightsReport = {
  period: {
    from: string;
    to: string;
  };
  topByRevenue: RentalInsightsProductLine[];
  topByQuantityDays: RentalInsightsProductLine[];
  utilization: {
    fleet: {
      onHand: number;
      reserved: number;
      available: number;
      utilizationPercent: number;
    };
    byProduct: RentalInsightsUtilizationProductLine[];
  };
  arAging: {
    buckets: RentalInsightsArAgingBucket[];
    totalOutstanding: number;
  };
};

export type RentalInsightsParams = {
  dateFrom?: string;
  dateTo?: string;
};
