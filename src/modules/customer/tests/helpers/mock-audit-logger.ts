import type {
  AuditEntry,
  AuditFailureEntry,
  IAuditLogger,
} from "@/shared/infrastructure/audit/audit-logger.interface";

export class MockAuditLogger implements IAuditLogger {
  readonly entries: AuditEntry[] = [];
  readonly failures: AuditFailureEntry[] = [];

  async log(entry: AuditEntry): Promise<void> {
    this.entries.push(structuredClone(entry));
  }

  async logFailure(entry: AuditFailureEntry): Promise<void> {
    this.failures.push(structuredClone(entry));
  }

  snapshot(): { entries: AuditEntry[]; failures: AuditFailureEntry[] } {
    return {
      entries: structuredClone(this.entries),
      failures: structuredClone(this.failures),
    };
  }

  restore(snapshot: {
    entries: AuditEntry[];
    failures: AuditFailureEntry[];
  }): void {
    this.entries.length = 0;
    this.failures.length = 0;
    this.entries.push(...structuredClone(snapshot.entries));
    this.failures.push(...structuredClone(snapshot.failures));
  }

  clear(): void {
    this.entries.length = 0;
    this.failures.length = 0;
  }
}
