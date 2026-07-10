export class AuditLogDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditLogDomainError";
  }
}

export class AuditLogNotFoundError extends AuditLogDomainError {
  constructor(id?: string) {
    super(id ? `Audit log not found: ${id}` : "Audit log not found");
    this.name = "AuditLogNotFoundError";
  }
}
