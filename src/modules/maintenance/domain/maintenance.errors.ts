export class MaintenanceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaintenanceDomainError";
  }
}

export class MaintenanceInvariantError extends MaintenanceDomainError {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "MaintenanceInvariantError";
    this.field = field;
  }
}

export class MaintenanceInvalidStatusError extends MaintenanceDomainError {
  readonly currentStatus: string;
  readonly action: string;

  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} maintenance in ${currentStatus} status`);
    this.name = "MaintenanceInvalidStatusError";
    this.currentStatus = currentStatus;
    this.action = action;
  }
}

export class MaintenanceInvalidInventoryError extends MaintenanceDomainError {
  readonly inventoryId?: string;

  constructor(message: string, inventoryId?: string) {
    super(message);
    this.name = "MaintenanceInvalidInventoryError";
    this.inventoryId = inventoryId;
  }
}

export function createMaintenanceNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new MaintenanceInvariantError(
      "Maintenance number is required",
      "maintenanceNumber",
    );
  }

  return trimmed;
}
