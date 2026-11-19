import { formatCurrency, formatNumber } from "@/lib/utils";

import type { BusinessInsights, InsightCountValue } from "./business-insights.types";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTH_SHORT = MONTH_NAMES.map((name) => name.slice(0, 3));
export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
export const WEEKDAY_SHORT = WEEKDAY_NAMES.map((name) => name.slice(0, 3));

/** "6 pm", "12 am" */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

export type InsightTone = "good" | "watch" | "info";

export type InsightCard = {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
};

/** Seasonal findings need a little history before they mean anything. */
const MIN_ORDERS_FOR_PEAKS = 8;

function peak(values: InsightCountValue[]): { top: InsightCountValue; share: number } | null {
  const total = values.reduce((sum, value) => sum + value.orders, 0);
  if (total === 0) {
    return null;
  }
  const top = [...values].sort((a, b) => b.orders - a.orders || b.bookedValue - a.bookedValue)[0]!;
  return { top, share: Math.round((top.orders / total) * 100) };
}

/** Busiest two-hour window of order entry. */
function peakHours(values: InsightCountValue[]): { start: number; share: number } | null {
  const total = values.reduce((sum, value) => sum + value.orders, 0);
  if (total === 0) {
    return null;
  }
  let best = 0;
  let bestCount = -1;
  for (let hour = 0; hour < 24; hour += 1) {
    const count = values[hour]!.orders + values[(hour + 1) % 24]!.orders;
    // On a tie, prefer the window that starts at the busier hour.
    if (
      count > bestCount ||
      (count === bestCount && values[hour]!.orders > values[best]!.orders)
    ) {
      best = hour;
      bestCount = count;
    }
  }
  return { start: best, share: Math.round((bestCount / total) * 100) };
}

/**
 * Plain-words findings for the owner, most useful first. Each one says what
 * the numbers show and what to do about it. Findings that need more history
 * than the business has are left out rather than guessed.
 */
export function deriveInsights(data: BusinessInsights): InsightCard[] {
  const cards: InsightCard[] = [];
  const { headline, seasons, customers, money } = data;
  const periodName = `the last ${data.period.months} months`;

  // Growth
  const change = headline.bookedValue.changePercent;
  if (change !== null && headline.orders.current > 0) {
    cards.push(
      change >= 0
        ? {
            id: "growth",
            tone: "good",
            title: `Sales up ${formatNumber(change)}%`,
            detail: `Booked ${formatCurrency(headline.bookedValue.current)} in ${periodName}, against ${formatCurrency(headline.bookedValue.previous)} in the ${data.period.months} months before.`,
          }
        : {
            id: "growth",
            tone: "watch",
            title: `Sales down ${formatNumber(Math.abs(change))}%`,
            detail: `Booked ${formatCurrency(headline.bookedValue.current)} in ${periodName}, against ${formatCurrency(headline.bookedValue.previous)} before. Check whether fewer orders or smaller orders caused it.`,
          },
    );
  }

  if (seasons.totalOrders >= MIN_ORDERS_FOR_PEAKS) {
    const month = peak(seasons.byMonthOfYear);
    if (month !== null) {
      cards.push({
        id: "peak-month",
        tone: "info",
        title: `${MONTH_NAMES[month.top.key - 1]} is your busiest month`,
        detail: `${month.share}% of events in the last 2 years started in ${MONTH_NAMES[month.top.key - 1]}. Repair and count stock, and line up staff and transport, a month before.`,
      });
    }
    const quarter = peak(seasons.byQuarter);
    if (quarter !== null) {
      cards.push({
        id: "peak-quarter",
        tone: "info",
        title: `Quarter ${quarter.top.key} is your peak season`,
        detail: `${quarter.share}% of events fall in Q${quarter.top.key}. Plan purchases and staff leave around it, and offer early-booking deals for the quiet quarters.`,
      });
    }
    const weekday = peak(seasons.byEventWeekday);
    if (weekday !== null) {
      cards.push({
        id: "peak-day",
        tone: "info",
        title: `Most events start on ${WEEKDAY_NAMES[weekday.top.key]}`,
        detail: `${weekday.share}% of events begin on a ${WEEKDAY_NAMES[weekday.top.key]}. Load and dispatch the day before, and keep that day free for deliveries.`,
      });
    }
    const hours = peakHours(seasons.byEntryHour);
    if (hours !== null) {
      cards.push({
        id: "peak-hours",
        tone: "info",
        title: `Busiest booking time: ${hourLabel(hours.start)}–${hourLabel((hours.start + 2) % 24)}`,
        detail: `${hours.share}% of orders are entered in these two hours. Make sure someone is free to answer calls and confirm orders then.`,
      });
    }
  }

  if (headline.medianLeadDays !== null && headline.orders.current >= 3) {
    const lead = headline.medianLeadDays;
    cards.push({
      id: "lead-time",
      tone: lead <= 3 ? "watch" : "info",
      title:
        lead < 1
          ? "Most customers book on the day of the event"
          : `Customers book about ${formatNumber(lead)} day${lead === 1 ? "" : "s"} ahead`,
      detail:
        lead < 1
          ? "Half of all orders are taken on the event day itself. Keep popular items ready to load, and check stock before promising. Asking regular customers to book earlier makes planning easier."
          : lead <= 3
          ? "Half of all orders come in 3 days or less before the event. Keep popular items ready to go, and check stock before promising."
          : `Half of all orders come in ${formatNumber(headline.medianLeadDays)} days or less before the event. That is your window to confirm stock and hire extra items if needed.`,
    });
  }

  // Stock
  const rented = data.products.filter((product) => product.revenue > 0 && product.revenuePerUnit !== null);
  const bestEarner = [...rented].sort((a, b) => (b.revenuePerUnit ?? 0) - (a.revenuePerUnit ?? 0))[0];
  if (bestEarner !== undefined) {
    cards.push({
      id: "best-earner",
      tone: "good",
      title: `${bestEarner.name} earn the most per item`,
      detail: `Each one you own brought in ${formatCurrency(bestEarner.revenuePerUnit)} in ${periodName}.${
        bestEarner.hireInTimes > 0 ? " You also had to hire more from suppliers, so buying more is likely to pay off." : ""
      }`,
    });
  }

  const shortages = data.products
    .filter((product) => product.hireInTimes > 0)
    .sort((a, b) => b.hireInCost - a.hireInCost);
  if (shortages.length > 0) {
    const top = shortages[0]!;
    cards.push({
      id: "shortage",
      tone: "watch",
      title: `You ran short of ${top.name}`,
      detail: `You hired ${formatNumber(top.hireInQuantity)} from suppliers ${formatNumber(top.hireInTimes)} time${top.hireInTimes === 1 ? "" : "s"}, costing ${formatCurrency(top.hireInCost)}. Buying your own may cost less over a season.`,
    });
  }

  const idle = data.products.filter((product) => product.unitsOwned > 0 && product.quantity === 0 && product.quantityDays === 0);
  if (idle.length > 0) {
    const names = idle.slice(0, 3).map((product) => product.name).join(", ");
    cards.push({
      id: "idle",
      tone: "watch",
      title: `${formatNumber(idle.length)} item${idle.length === 1 ? "" : "s"} earned nothing`,
      detail: `${names}${idle.length > 3 ? " and more" : ""} were not rented in ${periodName}. Offer them in packages, lower the rate, or sell them to free up money and space.`,
    });
  }

  const damaged = data.products
    .filter((product) => product.returned >= 10 && (product.damageLossPercent ?? 0) >= 5)
    .sort((a, b) => (b.damageLossPercent ?? 0) - (a.damageLossPercent ?? 0))[0];
  if (damaged !== undefined) {
    cards.push({
      id: "damage",
      tone: "watch",
      title: `${damaged.name} come back damaged or lost often`,
      detail: `${formatNumber(damaged.damageLossPercent)}% of those returned were damaged or lost. Check packing and handling, and make sure damage is charged to the customer.`,
    });
  }

  // Customers
  if (customers.activeCount >= 5 && customers.top5SharePercent >= 50) {
    cards.push({
      id: "concentration",
      tone: "watch",
      title: `Top 5 customers bring ${formatNumber(customers.top5SharePercent)}% of sales`,
      detail: "Losing one of them would hurt. Keep them close, and grow smaller customers so the business depends less on a few.",
    });
  }
  if (customers.activeCount >= 3) {
    cards.push({
      id: "repeat",
      tone: customers.repeatPercent >= 40 ? "good" : "info",
      title: `${formatNumber(customers.repeatPercent)}% of customers came back`,
      detail:
        customers.repeatPercent >= 40
          ? `${formatNumber(customers.returningCount)} returning customers in ${periodName}: good loyalty. Thank them, and ask for referrals.`
          : `Most customers are new. A follow-up call or a returning-customer discount after each event can bring them back.`,
    });
  }

  // Money
  if (money.collectionPercent !== null && money.collectionPercent < 80) {
    cards.push({
      id: "collection",
      tone: "watch",
      title: `Only ${formatNumber(money.collectionPercent)}% of invoices are paid`,
      detail: `${formatCurrency(money.outstanding)} is still owed, ${formatCurrency(money.overdue)} of it overdue. Ask for an advance at booking and follow up overdue invoices each week.`,
    });
  } else if (money.averageDaysToPay !== null && money.averageDaysToPay > 14) {
    cards.push({
      id: "days-to-pay",
      tone: "watch",
      title: `Customers take ${formatNumber(money.averageDaysToPay)} days to pay`,
      detail: "Shorter payment terms or an advance at booking would bring cash in sooner.",
    });
  }
  if (headline.cancellationPercent >= 10) {
    cards.push({
      id: "cancellations",
      tone: "watch",
      title: `${formatNumber(headline.cancellationPercent)}% of orders were cancelled`,
      detail: "Take a booking advance that is kept on late cancellation, and confirm with the customer a few days before the event.",
    });
  }

  return cards;
}
