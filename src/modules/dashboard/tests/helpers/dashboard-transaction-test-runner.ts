import type {
  DashboardWriteScope,
  IDashboardTransactionRunner,
} from "@/modules/dashboard/application/services/dashboard-transaction.runner";
import type { MockAuditLogger } from "@/modules/customer/tests/helpers/mock-audit-logger";

import type { InMemoryDashboardLayoutRepository } from "./in-memory-dashboard-layout.repository";

export function createDashboardPassThroughRunner(
  repository: InMemoryDashboardLayoutRepository,
  auditLogger: MockAuditLogger,
): IDashboardTransactionRunner {
  const scope: DashboardWriteScope = { repository, auditLogger };

  return {
    run: (operation) => operation(scope),
  };
}
