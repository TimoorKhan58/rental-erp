export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAvailableQuantity(
  quantityOnHand: number,
  reservedQuantity: number,
): number {
  return Math.max(0, quantityOnHand - reservedQuantity);
}

export function calculateInventoryValue(
  quantityOnHand: number,
  purchaseCost: number,
): number {
  return roundMoney(quantityOnHand * purchaseCost);
}

export function isLowStock(
  quantityOnHand: number,
  minimumStock: number,
): boolean {
  return quantityOnHand <= minimumStock;
}

export function isOverstock(
  quantityOnHand: number,
  maximumStock: number | null | undefined,
): boolean {
  if (maximumStock === null || maximumStock === undefined) {
    return false;
  }
  return quantityOnHand > maximumStock;
}

export function calculateRentalDurationDays(
  startDate: Date,
  endDate: Date,
): number {
  const ms = endDate.getTime() - startDate.getTime();
  if (ms < 0) {
    return 0;
  }
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return roundMoney(sum / values.length);
}

export function totalPages(total: number, pageSize: number): number {
  return total === 0 ? 0 : Math.ceil(total / pageSize);
}

export function startOfMonth(reference: Date = new Date()): Date {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
  );
}

export function endOfMonth(reference: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  );
}

export function calculateQuantityDays(
  quantity: number,
  numberOfDays: number,
): number {
  return Math.max(0, quantity * numberOfDays);
}

export function calculateUtilizationPercent(
  reserved: number,
  onHand: number,
): number {
  if (onHand <= 0) {
    return 0;
  }
  return roundMoney((reserved / onHand) * 100);
}

export type ArAgingBucketKey =
  | "current"
  | "d1_30"
  | "d31_60"
  | "d61_90"
  | "d90_plus";

export interface ArAgingInvoiceInput {
  balance: number;
  dueDate: Date | null;
  invoiceDate: Date;
}

export function resolveArAgingBucketKey(
  daysPastDue: number,
): ArAgingBucketKey {
  if (daysPastDue <= 0) {
    return "current";
  }
  if (daysPastDue <= 30) {
    return "d1_30";
  }
  if (daysPastDue <= 60) {
    return "d31_60";
  }
  if (daysPastDue <= 90) {
    return "d61_90";
  }
  return "d90_plus";
}

export function calculateDaysPastDue(
  dueDate: Date | null,
  invoiceDate: Date,
  reference: Date = new Date(),
): number {
  const anchor = dueDate ?? invoiceDate;
  const ms = reference.getTime() - anchor.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function resolveReportPeriod(
  query: { dateFrom?: Date; dateTo?: Date },
  reference: Date = new Date(),
): { dateFrom: Date; dateTo: Date } {
  return {
    dateFrom: query.dateFrom ?? startOfMonth(reference),
    dateTo: query.dateTo ?? reference,
  };
}

export const AR_AGING_BUCKET_ORDER = [
  "current",
  "d1_30",
  "d31_60",
  "d61_90",
  "d90_plus",
] as const satisfies readonly ArAgingBucketKey[];

export const AR_AGING_BUCKET_LABELS: Record<ArAgingBucketKey, string> = {
  current: "Not due yet",
  d1_30: "1–30 days",
  d31_60: "31–60 days",
  d61_90: "61–90 days",
  d90_plus: "90+ days",
};

export interface ArAgingBucketSummary {
  key: ArAgingBucketKey;
  label: string;
  invoiceCount: number;
  balance: number;
}

export function buildArAgingBuckets(
  invoices: ArAgingInvoiceInput[],
  reference: Date = new Date(),
): { buckets: ArAgingBucketSummary[]; totalOutstanding: number } {
  const bucketTotals = new Map<ArAgingBucketKey, { invoiceCount: number; balance: number }>(
    AR_AGING_BUCKET_ORDER.map((key) => [key, { invoiceCount: 0, balance: 0 }]),
  );

  let totalOutstanding = 0;

  for (const invoice of invoices) {
    const balance = roundMoney(invoice.balance);
    if (balance <= 0) {
      continue;
    }

    totalOutstanding = roundMoney(totalOutstanding + balance);
    const daysPastDue = calculateDaysPastDue(
      invoice.dueDate,
      invoice.invoiceDate,
      reference,
    );
    const key = resolveArAgingBucketKey(daysPastDue);
    const bucket = bucketTotals.get(key)!;
    bucket.invoiceCount += 1;
    bucket.balance = roundMoney(bucket.balance + balance);
  }

  return {
    buckets: AR_AGING_BUCKET_ORDER.map((key) => {
      const bucket = bucketTotals.get(key)!;
      return {
        key,
        label: AR_AGING_BUCKET_LABELS[key],
        invoiceCount: bucket.invoiceCount,
        balance: bucket.balance,
      };
    }),
    totalOutstanding,
  };
}

export function inDateRange(
  date: Date,
  dateFrom?: Date,
  dateTo?: Date,
): boolean {
  if (dateFrom !== undefined && date.getTime() < dateFrom.getTime()) {
    return false;
  }
  if (dateTo !== undefined && date.getTime() > dateTo.getTime()) {
    return false;
  }
  return true;
}
