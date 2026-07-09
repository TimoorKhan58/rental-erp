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
