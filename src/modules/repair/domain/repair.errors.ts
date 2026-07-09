export class RepairDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepairDomainError";
  }
}

export class RepairInvariantError extends RepairDomainError {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "RepairInvariantError";
    this.field = field;
  }
}

export class RepairInvalidStatusError extends RepairDomainError {
  readonly currentStatus: string;
  readonly action: string;

  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} repair in ${currentStatus} status`);
    this.name = "RepairInvalidStatusError";
    this.currentStatus = currentStatus;
    this.action = action;
  }
}

export class RepairInvalidItemError extends RepairDomainError {
  readonly returnInspectionItemId?: string;

  constructor(message: string, returnInspectionItemId?: string) {
    super(message);
    this.name = "RepairInvalidItemError";
    this.returnInspectionItemId = returnInspectionItemId;
  }
}

export function createRepairNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new RepairInvariantError("Repair number is required", "repairNumber");
  }

  return trimmed;
}
