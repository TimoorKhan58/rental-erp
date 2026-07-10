export class DashboardDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardDomainError";
  }
}

export class DashboardLayoutNotFoundError extends DashboardDomainError {
  constructor(userId?: string) {
    super(
      userId
        ? `Dashboard layout not found for user: ${userId}`
        : "Dashboard layout not found",
    );
    this.name = "DashboardLayoutNotFoundError";
  }
}

export class DashboardLayoutAlreadyExistsError extends DashboardDomainError {
  constructor(userId?: string) {
    super(
      userId
        ? `Dashboard layout already exists for user: ${userId}`
        : "Dashboard layout already exists",
    );
    this.name = "DashboardLayoutAlreadyExistsError";
  }
}

export class DashboardInvariantError extends DashboardDomainError {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "DashboardInvariantError";
  }
}

export class DashboardDefaultNotFoundError extends DashboardDomainError {
  constructor() {
    super("Default dashboard template not found");
    this.name = "DashboardDefaultNotFoundError";
  }
}
