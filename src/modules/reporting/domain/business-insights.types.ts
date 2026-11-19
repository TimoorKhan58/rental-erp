/**
 * Business insights (dashboard): seasons and peaks, stock earning power,
 * customers and money, built from one read of the business's records.
 *
 * Date-only values (booking, event, invoice, payment and expense dates) are
 * stored as midnight UTC of the calendar day. Timestamps (createdAt) are read
 * in the business's own time zone for hour-of-day and weekday questions.
 */

export const BUSINESS_INSIGHTS_PERIOD_MONTHS = [3, 6, 12, 24] as const;
export type BusinessInsightsPeriodMonths =
  (typeof BUSINESS_INSIGHTS_PERIOD_MONTHS)[number];

/** Months of history used for seasonal questions (month, quarter, weekday, hour). */
export const BUSINESS_INSIGHTS_SEASON_MONTHS = 24;

export type BusinessInsightsQuery = {
  months: BusinessInsightsPeriodMonths;
};

// ---------------------------------------------------------------------------
// Source rows (what the repository reads)
// ---------------------------------------------------------------------------

export type InsightOrderItemRow = {
  productId: string;
  quantity: number;
  numberOfDays: number;
  lineTotal: number;
};

export type InsightOrderRow = {
  id: string;
  customerId: string;
  status: string;
  /**
   * When the order was taken (its creation time). Not RentalOrder.bookingDate,
   * which the app sets to the event start date.
   */
  bookingDate: Date;
  eventStartDate: Date;
  eventEndDate: Date;
  createdAt: Date;
  grandTotal: number;
  items: InsightOrderItemRow[];
};

export type InsightCustomerRow = {
  id: string;
  code: string;
  name: string;
  /** When the customer's first non-draft, non-cancelled order was taken. */
  firstBookingDate: Date | null;
};

export type InsightProductRow = {
  id: string;
  code: string;
  name: string;
  categoryName: string | null;
  purchaseCost: number;
  isRentable: boolean;
  /** Units in warehouses plus units out with customers right now. */
  unitsOwned: number;
};

export type InsightInvoiceRow = {
  grandTotal: number;
  balance: number;
  status: string;
  invoiceDate: Date;
  dueDate: Date | null;
};

export type InsightPaymentRow = {
  amount: number;
  paymentDate: Date;
  method: string;
  invoiceDate: Date | null;
};

export type InsightExpenseRow = {
  amount: number;
  expenseDate: Date;
};

export type InsightHireInRow = {
  rentalOrderId: string;
  productId: string;
  quantity: number;
  cost: number;
  hireStartDate: Date;
};

export type InsightReturnRow = {
  productId: string;
  returned: number;
  damaged: number;
  lost: number;
  damageCharge: number;
  date: Date;
};

export type BusinessInsightsSource = {
  orders: InsightOrderRow[];
  customers: InsightCustomerRow[];
  products: InsightProductRow[];
  invoices: InsightInvoiceRow[];
  payments: InsightPaymentRow[];
  expenses: InsightExpenseRow[];
  hireIns: InsightHireInRow[];
  returns: InsightReturnRow[];
};

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type InsightComparedValue = {
  current: number;
  previous: number;
  /** Percent change from previous, or null when previous is 0. */
  changePercent: number | null;
};

export type BusinessInsightsHeadline = {
  bookedValue: InsightComparedValue;
  orders: InsightComparedValue;
  averageOrderValue: InsightComparedValue;
  collected: InsightComparedValue;
  activeCustomers: InsightComparedValue;
  expenses: InsightComparedValue;
  repeatCustomerPercent: number;
  cancellationPercent: number;
  averageRentalDays: number;
  medianLeadDays: number | null;
  stockOutPercent: number;
};

export type BusinessInsightsMonth = {
  /** "2026-11" */
  month: string;
  bookedValue: number;
  orders: number;
  collected: number;
  expenses: number;
  newCustomers: number;
  returningCustomers: number;
};

export type InsightCountValue = {
  key: number;
  orders: number;
  bookedValue: number;
};

export type BusinessInsightsSeasons = {
  /** From–to of the seasonal history used. */
  from: string;
  to: string;
  totalOrders: number;
  /** key 1-12; by event start month. */
  byMonthOfYear: InsightCountValue[];
  /** key 1-4; by event start quarter. */
  byQuarter: InsightCountValue[];
  /** key 0-6 (Sunday = 0); by event start weekday. */
  byEventWeekday: InsightCountValue[];
  /** key 0-23; hour the order was entered, business time. */
  byEntryHour: InsightCountValue[];
  /** [weekday 0-6][hour 0-23] order entries, business time. */
  entryHeatmap: number[][];
};

export type InsightBucket = {
  label: string;
  orders: number;
};

export type BusinessInsightsProduct = {
  productId: string;
  code: string;
  name: string;
  categoryName: string | null;
  unitsOwned: number;
  orders: number;
  quantity: number;
  quantityDays: number;
  revenue: number;
  /** Revenue per unit owned in the period. */
  revenuePerUnit: number | null;
  /** Share of owned unit-days that were out on rent in the period. */
  utilizationPercent: number | null;
  /** Revenue in the period against what the owned units cost to buy. */
  paybackPercent: number | null;
  hireInTimes: number;
  hireInQuantity: number;
  hireInCost: number;
  returned: number;
  damaged: number;
  lost: number;
  damageLossPercent: number | null;
  damageCharges: number;
};

export type BusinessInsightsCategory = {
  name: string;
  revenue: number;
  quantity: number;
};

export type BusinessInsightsCustomer = {
  customerId: string;
  code: string;
  name: string;
  orders: number;
  bookedValue: number;
  sharePercent: number;
};

export type BusinessInsightsCustomers = {
  activeCount: number;
  newCount: number;
  returningCount: number;
  repeatPercent: number;
  top: BusinessInsightsCustomer[];
  top5SharePercent: number;
  averageValuePerCustomer: number;
};

export type BusinessInsightsMoney = {
  billed: number;
  collected: number;
  collectionPercent: number | null;
  averageDaysToPay: number | null;
  outstanding: number;
  overdue: number;
  paymentMethods: Array<{ method: string; amount: number; count: number }>;
  aging: Array<{ label: string; amount: number; count: number }>;
  expenses: number;
  /** Booked value minus expenses, as a share of booked value. */
  marginPercent: number | null;
  hireInCost: number;
  damageCharges: number;
};

export type BusinessInsights = {
  period: {
    from: string;
    to: string;
    months: BusinessInsightsPeriodMonths;
    previousFrom: string;
    previousTo: string;
  };
  timeZone: string;
  headline: BusinessInsightsHeadline;
  monthly: BusinessInsightsMonth[];
  seasons: BusinessInsightsSeasons;
  leadTime: InsightBucket[];
  rentalLength: InsightBucket[];
  products: BusinessInsightsProduct[];
  categories: BusinessInsightsCategory[];
  customers: BusinessInsightsCustomers;
  money: BusinessInsightsMoney;
};
