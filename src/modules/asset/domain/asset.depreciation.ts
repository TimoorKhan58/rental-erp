export interface DepreciationScheduleEntry {
  month: number;
  date: Date;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export function calculateMonthlyDepreciation(
  purchaseCost: number,
  residualValue: number,
  usefulLifeMonths: number,
): number {
  if (usefulLifeMonths <= 0) {
    return 0;
  }

  const depreciableAmount = Math.max(purchaseCost - residualValue, 0);
  return depreciableAmount / usefulLifeMonths;
}

export function calculateAccumulatedDepreciation(
  purchaseDate: Date,
  monthlyDepreciation: number,
  asOfDate: Date,
): number {
  const monthsElapsed = countElapsedMonths(purchaseDate, asOfDate);
  return monthlyDepreciation * monthsElapsed;
}

export function calculateBookValue(
  purchaseCost: number,
  accumulatedDepreciation: number,
  residualValue: number,
): number {
  const bookValue = purchaseCost - accumulatedDepreciation;
  return Math.max(bookValue, residualValue);
}

export function generateDepreciationSchedule(
  purchaseDate: Date,
  purchaseCost: number,
  residualValue: number,
  usefulLifeMonths: number,
): DepreciationScheduleEntry[] {
  const monthlyDepreciation = calculateMonthlyDepreciation(
    purchaseCost,
    residualValue,
    usefulLifeMonths,
  );

  const schedule: DepreciationScheduleEntry[] = [];
  let accumulatedDepreciation = 0;

  for (let month = 1; month <= usefulLifeMonths; month += 1) {
    const date = addMonths(purchaseDate, month);
    accumulatedDepreciation += monthlyDepreciation;

    const bookValue = calculateBookValue(
      purchaseCost,
      accumulatedDepreciation,
      residualValue,
    );

    schedule.push({
      month,
      date,
      monthlyDepreciation,
      accumulatedDepreciation,
      bookValue,
    });

    if (bookValue <= residualValue) {
      break;
    }
  }

  return schedule;
}

function countElapsedMonths(startDate: Date, endDate: Date): number {
  if (endDate.getTime() < startDate.getTime()) {
    return 0;
  }

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
