export type RecoveryPhase =
  | "none"
  | "initial"
  | "growing"
  | "mid"
  | "advanced"
  | "recovered"
  | "overRecovered";

export type ProductPricing = {
  replacementCost: string | null;
  rentalRate: string;
};

export type ProductRecoveryStats = {
  revenue: number;
  quantityOnHand: number;
};

export type InventoryRecoveryMetrics = {
  percentage: number;
  phase: RecoveryPhase;
  phaseLabel: string;
  recoveredAmount: number;
  totalCost: number;
  surplusAmount: number;
  hasCostData: boolean;
  isOverRecovered: boolean;
};

function parseAmount(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRecoveryPhase(percentage: number): RecoveryPhase {
  if (percentage <= 0) {
    return "none";
  }

  if (percentage < 25) {
    return "initial";
  }

  if (percentage < 50) {
    return "growing";
  }

  if (percentage < 75) {
    return "mid";
  }

  if (percentage < 100) {
    return "advanced";
  }

  if (percentage > 100) {
    return "overRecovered";
  }

  return "recovered";
}

function getRecoveryPhaseLabel(phase: RecoveryPhase): string {
  switch (phase) {
    case "none":
      return "Not started";
    case "initial":
      return "Initial";
    case "growing":
      return "Growing";
    case "mid":
      return "Mid recovery";
    case "advanced":
      return "Advanced";
    case "recovered":
      return "Break-even";
    case "overRecovered":
      return "Over recovered";
  }
}

export function calculateInventoryRecovery(input: {
  quantityOnHand: number;
  reservedQuantity: number;
  pricing?: ProductPricing;
  productRecovery?: ProductRecoveryStats;
}): InventoryRecoveryMetrics {
  const unitCost = parseAmount(input.pricing?.replacementCost);
  const rentalRate = parseAmount(input.pricing?.rentalRate);
  const quantityOnHand = Math.max(0, input.quantityOnHand);
  const totalCost = unitCost * quantityOnHand;

  if (totalCost <= 0) {
    return {
      percentage: 0,
      phase: "none",
      phaseLabel: "No cost data",
      recoveredAmount: 0,
      totalCost: 0,
      surplusAmount: 0,
      hasCostData: false,
      isOverRecovered: false,
    };
  }

  let recoveredAmount = 0;

  if (input.productRecovery && input.productRecovery.revenue > 0) {
    const productQuantity = Math.max(1, input.productRecovery.quantityOnHand);
    const share = quantityOnHand / productQuantity;
    recoveredAmount = input.productRecovery.revenue * share;
  } else if (rentalRate > 0 && input.reservedQuantity > 0) {
    recoveredAmount = rentalRate * input.reservedQuantity;
  }

  const percentage = (recoveredAmount / totalCost) * 100;
  const phase = getRecoveryPhase(percentage);
  const surplusAmount = Math.max(0, recoveredAmount - totalCost);

  return {
    percentage,
    phase,
    phaseLabel: getRecoveryPhaseLabel(phase),
    recoveredAmount,
    totalCost,
    surplusAmount,
    hasCostData: true,
    isOverRecovered: percentage > 100,
  };
}
