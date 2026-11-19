import {
  BUSINESS_INSIGHTS_SEASON_MONTHS,
  type BusinessInsights,
  type BusinessInsightsCustomer,
  type BusinessInsightsMonth,
  type BusinessInsightsPeriodMonths,
  type BusinessInsightsProduct,
  type BusinessInsightsSource,
  type InsightBucket,
  type InsightComparedValue,
  type InsightCountValue,
  type InsightOrderRow,
} from "./business-insights.types";
import { buildArAgingBuckets, roundMoney } from "./reporting.rules";

const DAY_MS = 86_400_000;

/** Orders that are real business: not a draft, not cancelled. */
const NOT_COUNTED = new Set(["DRAFT", "CANCELLED"]);
const OPEN_INVOICE = new Set(["ISSUED", "PARTIALLY_PAID"]);
const BILLED_INVOICE = new Set(["ISSUED", "PARTIALLY_PAID", "PAID"]);

export type BusinessInsightsWindow = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  seasonFrom: Date;
};

function addMonths(date: Date, months: number): Date {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      Math.min(date.getUTCDate(), lastDay),
    ),
  );
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * The period runs from the first day of the month (months − 1) back to today,
 * so the monthly chart shows whole months. The comparison period is the same
 * length directly before it.
 */
export function resolveBusinessInsightsWindow(
  months: BusinessInsightsPeriodMonths,
  businessToday: Date,
): BusinessInsightsWindow {
  const from = startOfMonth(addMonths(businessToday, -(months - 1)));
  const previousFrom = addMonths(from, -months);
  const previousTo = addMonths(businessToday, -months);
  const seasonFrom = startOfMonth(
    addMonths(businessToday, -(BUSINESS_INSIGHTS_SEASON_MONTHS - 1)),
  );
  return { from, to: businessToday, previousFrom, previousTo, seasonFrom };
}

function within(date: Date, from: Date, to: Date): boolean {
  return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function percent(part: number, whole: number): number | null {
  if (whole <= 0) {
    return null;
  }
  return Math.round((part / whole) * 1000) / 10;
}

function compared(current: number, previous: number): InsightComparedValue {
  return {
    current: roundMoney(current),
    previous: roundMoney(previous),
    changePercent:
      previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : Math.round(((sorted[middle - 1]! + sorted[middle]!) / 2) * 10) / 10;
}

/** Weekday (0 = Sunday) and hour (0-23) of an instant in a time zone. */
export function localWeekdayAndHour(
  instant: Date,
  timeZone: string,
): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const weekdayName = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName);
  return { weekday: weekday < 0 ? 0 : weekday, hour };
}

function countValues(size: number, offset = 0): InsightCountValue[] {
  return Array.from({ length: size }, (_, index) => ({
    key: index + offset,
    orders: 0,
    bookedValue: 0,
  }));
}

function bucketize(
  values: number[],
  edges: Array<{ label: string; max: number }>,
): InsightBucket[] {
  const buckets = edges.map((edge) => ({ label: edge.label, orders: 0 }));
  for (const value of values) {
    const index = edges.findIndex((edge) => value <= edge.max);
    buckets[index < 0 ? edges.length - 1 : index]!.orders += 1;
  }
  return buckets;
}

const LEAD_TIME_EDGES = [
  { label: "Same day", max: 0 },
  { label: "1–3 days", max: 3 },
  { label: "4–7 days", max: 7 },
  { label: "8–14 days", max: 14 },
  { label: "15–30 days", max: 30 },
  { label: "Over 30 days", max: Number.POSITIVE_INFINITY },
];

const RENTAL_LENGTH_EDGES = [
  { label: "1 day", max: 1 },
  { label: "2 days", max: 2 },
  { label: "3 days", max: 3 },
  { label: "4–7 days", max: 7 },
  { label: "8–14 days", max: 14 },
  { label: "15+ days", max: Number.POSITIVE_INFINITY },
];

function overlapDays(
  start: Date,
  end: Date,
  from: Date,
  to: Date,
): number {
  const first = Math.max(start.getTime(), from.getTime());
  const last = Math.min(end.getTime(), to.getTime());
  if (last < first) {
    return 0;
  }
  return Math.round((last - first) / DAY_MS) + 1;
}

export function buildBusinessInsights(input: {
  source: BusinessInsightsSource;
  months: BusinessInsightsPeriodMonths;
  businessToday: Date;
  now: Date;
  timeZone: string;
}): BusinessInsights {
  const { source, months, businessToday, timeZone } = input;
  const window = resolveBusinessInsightsWindow(months, businessToday);
  const counted = source.orders.filter((order) => !NOT_COUNTED.has(order.status));
  const inPeriod = counted.filter((order) =>
    within(order.bookingDate, window.from, window.to),
  );
  const inPrevious = counted.filter((order) =>
    within(order.bookingDate, window.previousFrom, window.previousTo),
  );
  const nonDraftInPeriod = source.orders.filter(
    (order) =>
      order.status !== "DRAFT" && within(order.bookingDate, window.from, window.to),
  );
  const firstBooking = new Map(
    source.customers.map((customer) => [customer.id, customer.firstBookingDate]),
  );

  const sum = (orders: InsightOrderRow[]) =>
    orders.reduce((total, order) => total + order.grandTotal, 0);

  // --- money in the period -------------------------------------------------
  const paymentsIn = (from: Date, to: Date) =>
    source.payments.filter((payment) => within(payment.paymentDate, from, to));
  const expensesIn = (from: Date, to: Date) =>
    source.expenses
      .filter((expense) => within(expense.expenseDate, from, to))
      .reduce((total, expense) => total + expense.amount, 0);
  const periodPayments = paymentsIn(window.from, window.to);
  const collected = periodPayments.reduce((total, payment) => total + payment.amount, 0);
  const previousCollected = paymentsIn(window.previousFrom, window.previousTo).reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const periodExpenses = expensesIn(window.from, window.to);

  // --- customers -----------------------------------------------------------
  const customerIds = (orders: InsightOrderRow[]) =>
    new Set(orders.map((order) => order.customerId));
  const activeCustomers = customerIds(inPeriod);
  const isNewIn = (customerId: string, from: Date, to: Date) => {
    const first = firstBooking.get(customerId);
    return first !== null && first !== undefined && within(first, from, to);
  };
  const newCustomers = [...activeCustomers].filter((id) =>
    isNewIn(id, window.from, window.to),
  );
  const returningCount = activeCustomers.size - newCustomers.length;

  // --- headline ------------------------------------------------------------
  const leadDays = inPeriod.map((order) =>
    Math.max(0, daysBetween(order.bookingDate, order.eventStartDate)),
  );
  const rentalDays = inPeriod.map(
    (order) => Math.max(0, daysBetween(order.eventStartDate, order.eventEndDate)) + 1,
  );
  const hireInOrderIds = new Set(source.hireIns.map((row) => row.rentalOrderId));
  const periodOrderIds = new Set(inPeriod.map((order) => order.id));
  const ordersNeedingHireIn = [...periodOrderIds].filter((id) => hireInOrderIds.has(id));

  const headline = {
    bookedValue: compared(sum(inPeriod), sum(inPrevious)),
    orders: compared(inPeriod.length, inPrevious.length),
    averageOrderValue: compared(
      inPeriod.length > 0 ? sum(inPeriod) / inPeriod.length : 0,
      inPrevious.length > 0 ? sum(inPrevious) / inPrevious.length : 0,
    ),
    collected: compared(collected, previousCollected),
    activeCustomers: compared(activeCustomers.size, customerIds(inPrevious).size),
    expenses: compared(periodExpenses, expensesIn(window.previousFrom, window.previousTo)),
    repeatCustomerPercent: percent(returningCount, activeCustomers.size) ?? 0,
    cancellationPercent:
      percent(
        nonDraftInPeriod.filter((order) => order.status === "CANCELLED").length,
        nonDraftInPeriod.length,
      ) ?? 0,
    averageRentalDays:
      rentalDays.length > 0
        ? Math.round((rentalDays.reduce((a, b) => a + b, 0) / rentalDays.length) * 10) / 10
        : 0,
    medianLeadDays: median(leadDays),
    stockOutPercent: percent(ordersNeedingHireIn.length, inPeriod.length) ?? 0,
  };

  // --- monthly trend -------------------------------------------------------
  const monthly: BusinessInsightsMonth[] = [];
  for (let index = 0; index < months; index += 1) {
    const start = addMonths(window.from, index);
    const end = new Date(
      Math.min(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
        window.to.getTime(),
      ),
    );
    const orders = inPeriod.filter((order) => within(order.bookingDate, start, end));
    const customers = customerIds(orders);
    const fresh = [...customers].filter((id) => isNewIn(id, start, end)).length;
    monthly.push({
      month: monthKey(start),
      bookedValue: roundMoney(sum(orders)),
      orders: orders.length,
      collected: roundMoney(
        paymentsIn(start, end).reduce((total, payment) => total + payment.amount, 0),
      ),
      expenses: roundMoney(expensesIn(start, end)),
      newCustomers: fresh,
      returningCustomers: customers.size - fresh,
    });
  }

  // --- seasons and peaks ---------------------------------------------------
  const seasonOrders = counted.filter((order) =>
    within(order.eventStartDate, window.seasonFrom, businessToday),
  );
  const byMonthOfYear = countValues(12, 1);
  const byQuarter = countValues(4, 1);
  const byEventWeekday = countValues(7);
  for (const order of seasonOrders) {
    const month = order.eventStartDate.getUTCMonth();
    for (const bucket of [
      byMonthOfYear[month]!,
      byQuarter[Math.floor(month / 3)]!,
      byEventWeekday[order.eventStartDate.getUTCDay()]!,
    ]) {
      bucket.orders += 1;
      bucket.bookedValue = roundMoney(bucket.bookedValue + order.grandTotal);
    }
  }

  const byEntryHour = countValues(24);
  const entryHeatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const entryOrders = counted.filter((order) =>
    within(order.createdAt, window.seasonFrom, input.now),
  );
  for (const order of entryOrders) {
    const { weekday, hour } = localWeekdayAndHour(order.createdAt, timeZone);
    byEntryHour[hour]!.orders += 1;
    byEntryHour[hour]!.bookedValue = roundMoney(
      byEntryHour[hour]!.bookedValue + order.grandTotal,
    );
    entryHeatmap[weekday]![hour]! += 1;
  }

  // --- products ------------------------------------------------------------
  const periodDays = daysBetween(window.from, window.to) + 1;
  const productStats = new Map<string, BusinessInsightsProduct>();
  for (const product of source.products) {
    productStats.set(product.id, {
      productId: product.id,
      code: product.code,
      name: product.name,
      categoryName: product.categoryName,
      unitsOwned: product.unitsOwned,
      orders: 0,
      quantity: 0,
      quantityDays: 0,
      revenue: 0,
      revenuePerUnit: null,
      utilizationPercent: null,
      paybackPercent: null,
      hireInTimes: 0,
      hireInQuantity: 0,
      hireInCost: 0,
      returned: 0,
      damaged: 0,
      lost: 0,
      damageLossPercent: null,
      damageCharges: 0,
    });
  }

  const productOrders = new Map<string, Set<string>>();
  for (const order of inPeriod) {
    for (const item of order.items) {
      const stats = productStats.get(item.productId);
      if (stats === undefined) {
        continue;
      }
      stats.quantity += item.quantity;
      stats.revenue = roundMoney(stats.revenue + item.lineTotal);
      const ids = productOrders.get(item.productId) ?? new Set<string>();
      ids.add(order.id);
      productOrders.set(item.productId, ids);
    }
  }
  // Time out on rent counts every order whose event overlaps the period.
  for (const order of counted) {
    const days = overlapDays(order.eventStartDate, order.eventEndDate, window.from, window.to);
    if (days === 0) {
      continue;
    }
    for (const item of order.items) {
      const stats = productStats.get(item.productId);
      if (stats !== undefined) {
        stats.quantityDays += item.quantity * days;
      }
    }
  }
  for (const row of source.hireIns) {
    const stats = productStats.get(row.productId);
    if (stats === undefined || !within(row.hireStartDate, window.from, window.to)) {
      continue;
    }
    stats.hireInTimes += 1;
    stats.hireInQuantity += row.quantity;
    stats.hireInCost = roundMoney(stats.hireInCost + row.cost);
  }
  for (const row of source.returns) {
    const stats = productStats.get(row.productId);
    if (stats === undefined || !within(row.date, window.from, window.to)) {
      continue;
    }
    stats.returned += row.returned;
    stats.damaged += row.damaged;
    stats.lost += row.lost;
    stats.damageCharges = roundMoney(stats.damageCharges + row.damageCharge);
  }

  const purchaseCost = new Map(source.products.map((product) => [product.id, product.purchaseCost]));
  const products = [...productStats.values()]
    .map((stats) => {
      const ownedValue = stats.unitsOwned * (purchaseCost.get(stats.productId) ?? 0);
      return {
        ...stats,
        orders: productOrders.get(stats.productId)?.size ?? 0,
        revenuePerUnit:
          stats.unitsOwned > 0 ? roundMoney(stats.revenue / stats.unitsOwned) : null,
        utilizationPercent:
          stats.unitsOwned > 0
            ? Math.min(100, percent(stats.quantityDays, stats.unitsOwned * periodDays) ?? 0)
            : null,
        paybackPercent: percent(stats.revenue, ownedValue),
        damageLossPercent: percent(stats.damaged + stats.lost, stats.returned),
      };
    })
    .filter((stats) => {
      const product = source.products.find((row) => row.id === stats.productId);
      return (product?.isRentable ?? false) || stats.quantity > 0;
    })
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);

  const categoryTotals = new Map<string, { revenue: number; quantity: number }>();
  for (const product of products) {
    const name = product.categoryName ?? "No category";
    const total = categoryTotals.get(name) ?? { revenue: 0, quantity: 0 };
    total.revenue = roundMoney(total.revenue + product.revenue);
    total.quantity += product.quantity;
    categoryTotals.set(name, total);
  }
  const categories = [...categoryTotals.entries()]
    .map(([name, total]) => ({ name, ...total }))
    .filter((category) => category.revenue > 0 || category.quantity > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // --- customers -----------------------------------------------------------
  const customerInfo = new Map(source.customers.map((customer) => [customer.id, customer]));
  const customerTotals = new Map<string, { orders: number; value: number }>();
  for (const order of inPeriod) {
    const total = customerTotals.get(order.customerId) ?? { orders: 0, value: 0 };
    total.orders += 1;
    total.value += order.grandTotal;
    customerTotals.set(order.customerId, total);
  }
  const bookedTotal = sum(inPeriod);
  const ranked: BusinessInsightsCustomer[] = [...customerTotals.entries()]
    .map(([customerId, total]) => ({
      customerId,
      code: customerInfo.get(customerId)?.code ?? "",
      name: customerInfo.get(customerId)?.name ?? "Unknown customer",
      orders: total.orders,
      bookedValue: roundMoney(total.value),
      sharePercent: percent(total.value, bookedTotal) ?? 0,
    }))
    .sort((a, b) => b.bookedValue - a.bookedValue);
  const top5Value = ranked.slice(0, 5).reduce((total, row) => total + row.bookedValue, 0);

  // --- money ---------------------------------------------------------------
  const periodInvoices = source.invoices.filter(
    (invoice) =>
      BILLED_INVOICE.has(invoice.status) &&
      within(invoice.invoiceDate, window.from, window.to),
  );
  const billed = periodInvoices.reduce((total, invoice) => total + invoice.grandTotal, 0);
  const paidOnBilled = periodInvoices.reduce(
    (total, invoice) => total + (invoice.grandTotal - invoice.balance),
    0,
  );
  const timedPayments = periodPayments.filter((payment) => payment.invoiceDate !== null);
  const timedAmount = timedPayments.reduce((total, payment) => total + payment.amount, 0);
  const weightedDays = timedPayments.reduce(
    (total, payment) =>
      total +
      Math.max(0, daysBetween(payment.invoiceDate!, payment.paymentDate)) * payment.amount,
    0,
  );
  const openInvoices = source.invoices.filter((invoice) => OPEN_INVOICE.has(invoice.status));
  const aging = buildArAgingBuckets(
    openInvoices.map((invoice) => ({
      balance: invoice.balance,
      dueDate: invoice.dueDate,
      invoiceDate: invoice.invoiceDate,
    })),
    businessToday,
  );
  const methods = new Map<string, { amount: number; count: number }>();
  for (const payment of periodPayments) {
    const total = methods.get(payment.method) ?? { amount: 0, count: 0 };
    total.amount = roundMoney(total.amount + payment.amount);
    total.count += 1;
    methods.set(payment.method, total);
  }
  const hireInCost = products.reduce((total, product) => total + product.hireInCost, 0);
  const damageCharges = products.reduce((total, product) => total + product.damageCharges, 0);

  return {
    period: {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      months,
      previousFrom: window.previousFrom.toISOString(),
      previousTo: window.previousTo.toISOString(),
    },
    timeZone,
    headline,
    monthly,
    seasons: {
      from: window.seasonFrom.toISOString(),
      to: businessToday.toISOString(),
      totalOrders: seasonOrders.length,
      byMonthOfYear,
      byQuarter,
      byEventWeekday,
      byEntryHour,
      entryHeatmap,
    },
    leadTime: bucketize(leadDays, LEAD_TIME_EDGES),
    rentalLength: bucketize(rentalDays, RENTAL_LENGTH_EDGES),
    products,
    categories,
    customers: {
      activeCount: activeCustomers.size,
      newCount: newCustomers.length,
      returningCount,
      repeatPercent: headline.repeatCustomerPercent,
      top: ranked.slice(0, 10),
      top5SharePercent: percent(top5Value, bookedTotal) ?? 0,
      averageValuePerCustomer:
        activeCustomers.size > 0 ? roundMoney(bookedTotal / activeCustomers.size) : 0,
    },
    money: {
      billed: roundMoney(billed),
      collected: roundMoney(collected),
      collectionPercent: percent(paidOnBilled, billed),
      averageDaysToPay:
        timedAmount > 0 ? Math.round((weightedDays / timedAmount) * 10) / 10 : null,
      outstanding: aging.totalOutstanding,
      overdue: roundMoney(
        aging.buckets
          .filter((bucket) => bucket.key !== "current")
          .reduce((total, bucket) => total + bucket.balance, 0),
      ),
      paymentMethods: [...methods.entries()]
        .map(([method, total]) => ({ method, ...total }))
        .sort((a, b) => b.amount - a.amount),
      aging: aging.buckets.map((bucket) => ({
        label: bucket.label,
        amount: bucket.balance,
        count: bucket.invoiceCount,
      })),
      expenses: roundMoney(periodExpenses),
      marginPercent: percent(bookedTotal - periodExpenses, bookedTotal),
      hireInCost: roundMoney(hireInCost),
      damageCharges: roundMoney(damageCharges),
    },
  };
}
