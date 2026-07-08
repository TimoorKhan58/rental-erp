/**
 * Composition root for shared infrastructure dependencies.
 * Feature modules should import factories from here rather than individual DI files.
 */
export {
  createSharedDeps,
  createSharedDepsFromExecutionContext,
  createSharedDepsFromRequestContext,
  createTransactionScopedSharedDeps,
  runWithSharedTransaction,
  runWithTransactionScopedSharedDeps,
  type CreateSharedDepsFromRequestContextOptions,
  type CreateSharedDepsOptions,
  type SharedDeps,
} from "./shared-deps";
export {
  createSharedAuditDeps,
  createAuditLoggerFromExecutionContext,
  type CreateSharedAuditDepsOptions,
  type SharedAuditDeps,
} from "./shared-audit-deps";
export {
  createSharedDatabaseDeps,
  type SharedDatabaseDeps,
} from "./shared-database-deps";
export {
  createSharedNotificationDeps,
  createNotificationServiceFromExecutionContext,
  type CreateSharedNotificationDepsOptions,
  type SharedNotificationDeps,
} from "./shared-notification-deps";
export {
  createSharedStorageDeps,
  createFileStorageFromExecutionContext,
  type CreateSharedStorageDepsOptions,
  type SharedStorageDeps,
} from "./shared-storage-deps";
