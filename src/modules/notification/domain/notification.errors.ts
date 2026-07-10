export class NotificationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationDomainError";
  }
}

export class NotificationNotFoundError extends NotificationDomainError {
  constructor(id?: string) {
    super(id ? `Notification not found: ${id}` : "Notification not found");
    this.name = "NotificationNotFoundError";
  }
}

export class NotificationAccessDeniedError extends NotificationDomainError {
  constructor() {
    super("You do not have access to this notification");
    this.name = "NotificationAccessDeniedError";
  }
}
