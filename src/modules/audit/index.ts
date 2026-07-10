/**
 * Audit module — read-only API for audit_logs table.
 *
 * Layer exports:
 * - domain: entity, repository contract, list query
 * - application: DTOs, schemas, services
 * - infrastructure: PrismaAuditLogRepository and factories
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";
